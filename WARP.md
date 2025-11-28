# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

This is a Node.js (ESM) Express API for user authentication and basic user management backed by Neon Postgres via Drizzle ORM. It is designed to run primarily in Docker, with a Neon Local proxy for development and Neon Cloud for production. Security is enforced via Arcjet, and logging uses Winston + Morgan.

Key documentation:

- `QUICKSTART.md` – concise developer setup and common Docker commands.
- `DOCKER.md` – full Docker + Neon Local/Cloud setup and migration workflow.
- `DOCKER_SETUP_SUMMARY.md` – high-level architecture and environment summary.

## Common commands

### Node scripts (non-Docker)

Use these when running the app directly on your machine (expects `DATABASE_URL` and other env vars to be set, e.g. via `.env`).

- Install dependencies:
  - `npm install`
- Start API (watch mode):
  - `npm run dev`  
    Starts `src/index.js` which boots `src/server.js` → `src/app.js` on `PORT` (default 3000).
- Start API (plain / production-like):
  - `npm start`

### Linting and formatting

- Lint entire project:
  - `npm run lint`
- Lint and auto-fix:
  - `npm run lint:fix`
- Check formatting:
  - `npm run format:check`
- Apply formatting:
  - `npm run format`

### Database (Drizzle + Neon)

These scripts assume `DATABASE_URL` is set for the current environment.

- Generate new migrations from Drizzle schema:
  - `npm run db:generate`
- Apply migrations:
  - `npm run db:migrate`
- Open Drizzle Studio (DB UI):
  - `npm run db:studio`

In Docker-based development, you typically run these **inside the app container** (see below).

### Docker-based development (Neon Local)

Environment:

- Uses `docker-compose.dev.yml`.
- Requires `.env.development` copied to `.env` and filled with Neon credentials (`NEON_API_KEY`, `NEON_PROJECT_ID`, etc.) as described in `QUICKSTART.md` / `DOCKER.md`.

Core commands:

- Start (build + up, detached):
  - `docker-compose -f docker-compose.dev.yml up -d --build`
- Tail logs for all services:
  - `docker-compose -f docker-compose.dev.yml logs -f`
- Stop services:
  - `docker-compose -f docker-compose.dev.yml down`
- Stop and remove volumes (full reset):
  - `docker-compose -f docker-compose.dev.yml down -v`

Database/migrations in dev (run inside the `app` service):

- Generate migrations:
  - `docker-compose -f docker-compose.dev.yml exec app npm run db:generate`
- Apply migrations:
  - `docker-compose -f docker-compose.dev.yml exec app npm run db:migrate`
- Open Drizzle Studio:
  - `docker-compose -f docker-compose.dev.yml exec app npm run db:studio`

> Note: `QUICKSTART.md` and `DOCKER.md` describe a `dev.ps1` helper script for Windows, but that script is **not present** in this repo. Prefer the raw `docker-compose` commands above.

### Docker-based production

Environment:

- Uses `docker-compose.prod.yml`.
- Requires `.env.production` (or `--env-file`) with `DATABASE_URL` pointing to Neon Cloud and other production env vars (see `DOCKER.md`).

Core commands:

- Build and start (detached):
  - `docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build`
- Tail app logs:
  - `docker-compose -f docker-compose.prod.yml logs -f app`
- Run migrations:
  - `docker-compose -f docker-compose.prod.yml exec app npm run db:migrate`
- Stop services:
  - `docker-compose -f docker-compose.prod.yml down`

### Testing

There is currently **no test runner configured** (no `test` script in `package.json` and no test framework dependency). Before adding tests, introduce a test framework (e.g. Vitest/Jest) and wire it through `package.json` scripts.

## High-level architecture

### Execution flow

- Entry point: `src/index.js`
  - Loads environment variables via `dotenv/config`.
  - Imports `src/server.js`.
- `src/server.js`
  - Imports the Express app from `src/app.js`.
  - Reads `PORT` from `process.env.PORT || 3000`.
  - Calls `app.listen(PORT, ...)`.
- `src/app.js`
  - Creates and configures the Express app:
    - Security/headers: `helmet()`.
    - CORS: `cors()`.
    - Body parsing: `express.json()` and `express.urlencoded()`.
    - Cookies: `cookie-parser`.
    - HTTP request logging: `morgan('combined')` piped into the custom Winston logger.
    - Global security middleware: `securityMiddleware` (Arcjet integration) applied **before** API routes.
  - Defines basic routes:
    - `GET /` – simple greeting, logs via Winston.
    - `GET /health` – JSON health probe with status, timestamp, and process uptime (used by Docker health checks).
    - `GET /api` – simple API health message.
  - Mounts feature routes:
    - `/api/auth` → `src/routes/auth.routes.js`.
    - `/api/users` → `src/routes/users.routes.js`.

### Routing, controllers, and services

The application follows a conventional Express layering:

- `src/routes/*.routes.js`
  - Define URL structure and attach controllers.
  - Examples:
    - `auth.routes.js` – `POST /sign-up`, `/sign-in`, `/sign-out` mapped to auth controllers.
    - `users.routes.js` – `GET /` for listing users, `GET/PUT/DELETE /:id` (placeholder handlers except `GET /`).

- `src/controllers/*.controller.js`
  - Handle HTTP concerns (validation, response shapes, status codes) and delegate business logic to services.
  - `auth.controller.js`:
    - Validates request body with Zod schemas (`signupSchema`, `signInSchema`).
    - On signup:
      - Calls `createUser` service.
      - Signs a JWT via `jwttoken.sign`.
      - Sets a cookie via `cookies.set`.
      - Logs and returns a sanitized user object.
    - On signin:
      - Calls `authenticateUser` service.
      - Same JWT + cookie + logging pattern.
    - On signout:
      - Clears the auth cookie and logs the event.
  - `users.controller.js`:
    - Calls `getAllUsers` service.
    - Returns a payload with `users` and `count`.

- `src/services/*.service(s).js`
  - Implement business logic and data access via Drizzle ORM.
  - `auth.service.js`:
    - Wraps password hashing and comparison using `bcrypt`.
    - `createUser`:
      - Checks for existing user by email using Drizzle `eq` over `users` table.
      - Inserts a new user with hashed password.
      - Returns a subset of fields (id, name, email, role, created_at).
    - `authenticateUser`:
      - Fetches user by email.
      - Verifies password.
      - Returns a sanitized user object or throws on failure.
  - `users.services.js`:
    - `getAllUsers`:
      - Uses Drizzle to select a subset of columns from the `users` table and returns the list.

### Database layer (Neon + Drizzle)

- `src/config/database.js`
  - Configures Neon and Drizzle:
    - In `NODE_ENV === 'development'`:
      - Points `neonConfig.fetchEndpoint` to `http://neon-local:5432/sql`.
      - Disables secure WebSocket and uses HTTP fetch for queries, matching the Neon Local proxy.
    - In other environments (e.g. production):
      - Uses the default Neon Cloud configuration.
  - Creates a `sql` client from `@neondatabase/serverless` using `process.env.DATABASE_URL`.
  - Wraps it with `drizzle(sql)` and exports `db` for use in services.

- `src/models/user.model.js`
  - Defines a `users` table using Drizzle's `pgTable`:
    - Fields: `id`, `name`, `email` (unique), `password`, `role` (default `'user'`), `created_at`, `updated_at`.
  - This schema is the source of truth for migrations generated via `npm run db:generate`.

Overall, the Neon integration is environment-aware: in dev, calls go through the Neon Local container; in prod, through Neon Cloud using the `DATABASE_URL` configured in `.env.production`.

### Security and rate limiting (Arcjet)

- `src/config/arcjet.js`
  - Configures a base Arcjet client with:
    - `shield` rule in `LIVE` mode.
    - `detectBot` rule allowing known search engines and preview bots.
    - A default `slidingWindow` rule (2s, max 5 requests) as a base.

- `src/middleware/security.middleware.js`
  - Global middleware applied in `app.js` **before** all routes.
  - Derives a `role` from `req.user?.role` (falls back to `'guest'` when unauthenticated).
  - Per-role rate limits:
    - `admin`: 20 requests/min.
    - `user`: 10 requests/min.
    - `guest`: 5 requests/min.
  - For each request:
    - Creates a rule-scoped Arcjet client with a role-specific `slidingWindow`.
    - Calls `client.protect(req)` and inspects the decision:
      - If denied as bot → log and return 403 with a bot-related message.
      - If denied by shield → log and return 403 with a security-policy message.
      - If rate-limited → log and return 403 with a too-many-requests message.
    - On success → `next()`.
  - On internal Arcjet errors → logs and responds with a 500 error.

This middleware is central to request-level security and should be considered when adding new routes or authentication flows.

### Logging and observability

- `src/config/logger.js`
  - Configures a Winston logger with:
    - Log level from `LOG_LEVEL` (default `info`).
    - JSON output including timestamps and error stacks.
    - File transports:
      - `logs/error.log` (level `error`).
      - `logs/combined.log` (all logs).
    - Console transport in non-production environments with colorized, simple output.
  - The `logs/` directory and `*.log` files are ignored by Git (see `.gitignore`).

- `src/app.js`
  - Integrates `morgan('combined')` with Winston by directing its stream to `logger.info`.
  - Exposes `/health` for health checks and `/api` for a simple API probe; both are used by Docker health checks and useful in debugging.

### Validation and utilities

- `src/validations/auth.validation.js`
  - Uses Zod to define schemas for signup and signin payloads.
  - Controllers rely on `safeParse` and return structured error responses using a shared formatter.

- `src/utils/format.js`
  - `formatValidationError` converts Zod errors into a human-readable string (joining `issues` messages).

- `src/utils/jwt.js`
  - Wraps `jsonwebtoken` into a `jwttoken` helper with `sign` and `verify` methods.
  - Reads `JWT_SECRET` from env (falls back to a placeholder string; replace in production via env vars).

- `src/utils/cookies.js`
  - Centralizes secure cookie options (HTTP-only, `SameSite=strict`, `secure` in production) and exposes helper methods to set, clear, and read cookies.

## Other important notes for Warp

- Module resolution uses Node `imports` from `package.json`:
  - E.g. `#config/*`, `#controllers/*`, `#middleware/*`, `#models/*`, `#routes/*`, `#services/*`, `#utils/*`, `#validations/*` mapped to `src/*` subdirectories.
  - When generating or editing code, prefer using these import paths for consistency.
- Environment files:
  - `.env.development` / `.env.production` templates are referenced heavily in the docs but are not committed.
  - When adding new configuration, keep env var usage consistent with the patterns already in `DOCKER.md`.
- Logs and Neon Local metadata (`.neon_local/`) are intentionally excluded from version control via `.gitignore`.
