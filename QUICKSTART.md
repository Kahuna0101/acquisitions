# Quick Start Guide

Get the Acquisitions application running in under 5 minutes!

## 🚀 Development Setup (Recommended)

### Prerequisites
- Docker Desktop installed and running
- Neon account and API credentials

### Steps

1. **Clone and navigate to the project**
   ```bash
   git clone https://github.com/Kahuna0101/acquisitions.git
   cd acquisitions
   ```

2. **Configure environment**
   ```bash
   # Copy development environment template
   cp .env.development .env
   
   # Edit .env and add your Neon credentials:
   # NEON_API_KEY=your_api_key
   # NEON_PROJECT_ID=your_project_id
   ```

3. **Start the application**
   
   **Option A: Using PowerShell helper (Windows)**
   ```powershell
   .\dev.ps1 start
   ```
   
   **Option B: Using Docker Compose directly**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d --build
   ```

4. **Run database migrations**
   ```bash
   docker-compose -f docker-compose.dev.yml exec app npm run db:migrate
   ```

5. **Access the application**
   - Application: http://localhost:3000
   - Database: localhost:5432

### View Logs
```bash
docker-compose -f docker-compose.dev.yml logs -f
```

### Stop the application
```bash
docker-compose -f docker-compose.dev.yml down
```

---

## 🏭 Production Setup

### Steps

1. **Configure production environment**
   ```bash
   cp .env.production .env
   
   # Edit .env and add your Neon Cloud connection string:
   # DATABASE_URL=postgres://...neon.tech/neondb
   ```

2. **Build and start**
   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```

3. **Run migrations**
   ```bash
   docker-compose -f docker-compose.prod.yml exec app npm run db:migrate
   ```

---

## 🛠️ Common Commands

### Development
```bash
# Start development environment
.\dev.ps1 start                          # PowerShell
docker-compose -f docker-compose.dev.yml up -d  # Direct

# View logs
.\dev.ps1 logs                           # PowerShell
docker-compose -f docker-compose.dev.yml logs -f  # Direct

# Run migrations
.\dev.ps1 migrate                        # PowerShell
docker-compose -f docker-compose.dev.yml exec app npm run db:migrate  # Direct

# Access application shell
.\dev.ps1 shell                          # PowerShell
docker-compose -f docker-compose.dev.yml exec app sh  # Direct

# Stop environment
.\dev.ps1 stop                           # PowerShell
docker-compose -f docker-compose.dev.yml down  # Direct

# Clean everything (removes volumes)
.\dev.ps1 clean                          # PowerShell
docker-compose -f docker-compose.dev.yml down -v  # Direct
```

### Production
```bash
# Start production environment
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Run migrations
docker-compose -f docker-compose.prod.yml exec app npm run db:migrate

# Stop environment
docker-compose -f docker-compose.prod.yml down
```

---

## 📋 Getting Neon Credentials

1. **Neon API Key**
   - Go to [Neon Console](https://console.neon.tech)
   - Navigate to Settings → API Keys
   - Click "Generate new API key"
   - Copy and save the key

2. **Neon Project ID**
   - Go to your project in [Neon Console](https://console.neon.tech/app/projects)
   - Navigate to Project Settings → General
   - Copy the Project ID

3. **Production Database URL**
   - In your Neon project, go to the Dashboard
   - Click "Connection Details"
   - Copy the connection string

---

## ❓ Troubleshooting

### Port already in use
If port 3000 or 5432 is already in use, edit `.env` and change:
```env
PORT=3001  # Change application port
```

For database port conflicts, edit `docker-compose.dev.yml`:
```yaml
neon-local:
  ports:
    - "5433:5432"  # Change host port
```

### Container won't start
```bash
# Check logs
docker-compose -f docker-compose.dev.yml logs

# Restart everything
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d --build
```

### Database connection issues
1. Verify your Neon credentials in `.env`
2. Check Neon Local container logs:
   ```bash
   docker-compose -f docker-compose.dev.yml logs neon-local
   ```
3. Ensure your Neon API key has proper permissions

---

## 📚 Full Documentation

For complete documentation, see [DOCKER.md](./DOCKER.md)

---

## 🎯 What's Next?

- Read the full [Docker & Neon Database Setup Guide](./DOCKER.md)
- Learn about [Neon Local](https://neon.com/docs/local/neon-local)
- Explore [Drizzle ORM](https://orm.drizzle.team/)
- Check [Neon Documentation](https://neon.com/docs)
