# Docker & Neon Database Setup Guide

This guide explains how to run the Acquisitions application using Docker with Neon Database in both development and production environments.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Development Setup (Neon Local)](#development-setup-neon-local)
- [Production Setup (Neon Cloud)](#production-setup-neon-cloud)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Troubleshooting](#troubleshooting)

---

## Overview

The application supports two deployment modes:

### Development Mode
- Uses **Neon Local** - a Docker-based proxy that creates ephemeral database branches
- Each container start creates a fresh database branch
- Automatic cleanup when container stops
- Perfect for isolated testing and development

### Production Mode
- Uses **Neon Cloud** - the actual serverless Postgres database
- Direct connection to your production Neon project
- Managed via environment variables
- No local proxy required

---

## Prerequisites

### Required Software
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v3.8+
- Git

### Required Credentials
- **Neon API Key**: Get from [Neon Console → Settings → API Keys](https://console.neon.tech/app/settings/api-keys)
- **Neon Project ID**: Found in [Neon Console → Project Settings](https://console.neon.tech/app/projects)
- **Production Database URL**: Your Neon Cloud connection string

---

## Development Setup (Neon Local)

### Step 1: Configure Environment

Copy and configure your development environment file:

```bash
# Copy the example file
cp .env.development .env

# Edit .env and add your Neon credentials:
# - NEON_API_KEY
# - NEON_PROJECT_ID
```

Edit `.env`:

```env
# Required: Get from Neon Console
NEON_API_KEY=your_actual_neon_api_key
NEON_PROJECT_ID=your_actual_neon_project_id

# Optional: Specify parent branch (defaults to main branch)
PARENT_BRANCH_ID=

# Optional: Set to false to persist branches after shutdown
DELETE_BRANCH=true
```

### Step 2: Start Development Environment

```bash
# Build and start services
docker-compose -f docker-compose.dev.yml up --build

# Or run in detached mode
docker-compose -f docker-compose.dev.yml up -d --build
```

### Step 3: Verify Setup

The application will be available at:
- **Application**: http://localhost:3000
- **Neon Local Proxy**: localhost:5432

Check logs:
```bash
docker-compose -f docker-compose.dev.yml logs -f
```

### Step 4: Run Database Migrations

```bash
# Generate migrations (if needed)
docker-compose -f docker-compose.dev.yml exec app npm run db:generate

# Run migrations
docker-compose -f docker-compose.dev.yml exec app npm run db:migrate
```

### Step 5: Stop Development Environment

```bash
# Stop and remove containers
docker-compose -f docker-compose.dev.yml down

# Remove volumes as well (complete cleanup)
docker-compose -f docker-compose.dev.yml down -v
```

### How Neon Local Works

1. **Container starts** → Neon Local creates an ephemeral branch from your parent branch
2. **Application connects** → Uses `postgres://neon:npg@neon-local:5432/neondb`
3. **Container stops** → Neon Local deletes the ephemeral branch (if `DELETE_BRANCH=true`)

Each development session gets a fresh copy of your database!

---

## Production Setup (Neon Cloud)

### Step 1: Configure Environment

Create production environment file:

```bash
cp .env.production .env
```

Edit `.env.production`:

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Your actual Neon Cloud connection string
DATABASE_URL=postgres://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**⚠️ IMPORTANT**: Never commit `.env.production` with real credentials to version control!

### Step 2: Build Production Image

```bash
docker-compose -f docker-compose.prod.yml build
```

### Step 3: Start Production Environment

```bash
# Using environment file
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Or set DATABASE_URL via environment variable
DATABASE_URL="your_neon_cloud_url" docker-compose -f docker-compose.prod.yml up -d
```

### Step 4: Run Database Migrations

```bash
docker-compose -f docker-compose.prod.yml exec app npm run db:migrate
```

### Step 5: Monitor Application

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Check health status
docker-compose -f docker-compose.prod.yml ps
```

### Step 6: Stop Production Environment

```bash
docker-compose -f docker-compose.prod.yml down
```

---

## Environment Variables

### Development Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `NEON_API_KEY` | Yes | Your Neon API key | N/A |
| `NEON_PROJECT_ID` | Yes | Your Neon project ID | N/A |
| `PARENT_BRANCH_ID` | No | Parent branch for ephemeral branches | Default branch |
| `DELETE_BRANCH` | No | Delete branch on container stop | `true` |
| `PORT` | No | Application port | `3000` |
| `NODE_ENV` | No | Environment mode | `development` |
| `LOG_LEVEL` | No | Logging level | `debug` |
| `DB_NAME` | No | Database name | `neondb` |

### Production Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | Neon Cloud connection string | N/A |
| `PORT` | No | Application port | `3000` |
| `NODE_ENV` | No | Environment mode | `production` |
| `LOG_LEVEL` | No | Logging level | `info` |

---

## Database Migrations

### Development

```bash
# Generate new migration
docker-compose -f docker-compose.dev.yml exec app npm run db:generate

# Apply migrations
docker-compose -f docker-compose.dev.yml exec app npm run db:migrate

# Open Drizzle Studio (database GUI)
docker-compose -f docker-compose.dev.yml exec app npm run db:studio
```

### Production

```bash
# Apply migrations
docker-compose -f docker-compose.prod.yml exec app npm run db:migrate
```

---

## Troubleshooting

### Issue: "connection refused" to Neon Local

**Solution**: Wait for Neon Local to be healthy before app starts. The health check ensures this, but you can verify:

```bash
docker-compose -f docker-compose.dev.yml logs neon-local
```

### Issue: Self-signed certificate error

**Solution**: The application is already configured to handle self-signed certificates in development. If you're connecting via a Postgres client, add:

```javascript
ssl: { rejectUnauthorized: false }
```

### Issue: Branch not being created

**Solutions**:
1. Verify `NEON_API_KEY` and `NEON_PROJECT_ID` are correct
2. Check Neon Local logs: `docker-compose -f docker-compose.dev.yml logs neon-local`
3. Ensure your API key has proper permissions

### Issue: Database not persisting between restarts

**Expected Behavior**: By default, ephemeral branches are deleted when the container stops (`DELETE_BRANCH=true`).

**Solution**: To persist branches, set `DELETE_BRANCH=false` in your `.env` file.

### Issue: Port 5432 already in use

**Solution**: Stop any local Postgres instances or change the port mapping:

```yaml
# In docker-compose.dev.yml
neon-local:
  ports:
    - "5433:5432"  # Use different host port
```

Then update `DATABASE_URL` to use the new port.

### Issue: Hot reload not working in development

**Solution**: Ensure volume mounts are correct in `docker-compose.dev.yml`:

```yaml
volumes:
  - ./src:/app/src
  - /app/node_modules  # Don't overwrite
```

---

## Best Practices

### Development

1. **Use ephemeral branches** (`DELETE_BRANCH=true`) for clean testing
2. **Commit schema changes** via migrations, not manual SQL
3. **Use Drizzle Studio** to inspect database state
4. **Enable hot reload** with volume mounts for faster iteration

### Production

1. **Never hardcode credentials** - use environment variables or secrets management
2. **Use connection pooling** - Neon's serverless driver handles this automatically
3. **Monitor logs** regularly with `docker-compose logs`
4. **Run migrations** before deploying new code
5. **Use health checks** to ensure database connectivity

### Security

1. **Never commit** `.env`, `.env.production`, or `.env.development` with real credentials
2. **Rotate API keys** regularly
3. **Use secrets management** (AWS Secrets Manager, Azure Key Vault, etc.) in production
4. **Limit API key permissions** to minimum required scope
5. **Use separate Neon projects** for dev, staging, and production

---

## Additional Resources

- [Neon Local Documentation](https://neon.com/docs/local/neon-local)
- [Neon Serverless Driver](https://neon.com/docs/serverless/serverless-driver)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

---

## Quick Reference

### Development Commands

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Run migrations
docker-compose -f docker-compose.dev.yml exec app npm run db:migrate

# Access app shell
docker-compose -f docker-compose.dev.yml exec app sh

# Stop environment
docker-compose -f docker-compose.dev.yml down
```

### Production Commands

```bash
# Build production image
docker-compose -f docker-compose.prod.yml build

# Start production environment
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec app npm run db:migrate

# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Stop environment
docker-compose -f docker-compose.prod.yml down
```

---

## Support

For issues or questions:
- Check the [Neon Documentation](https://neon.com/docs)
- Review [GitHub Issues](https://github.com/Kahuna0101/acquisitions/issues)
- Contact the development team
