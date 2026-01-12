# Docker Setup Guide - Martin-Coder

## Quick Start

### Automated Setup (Recommended)

```bash
# Interactive menu
./martin.sh

# Or use direct commands
./martin.sh start
```

The management script provides:
- Interactive menu for all operations
- Docker and Docker Compose installation checks
- Automatic `.env` file creation from template
- Container building and service startup
- Service health checks and status monitoring
- Log viewing and container shell access
- Clean shutdown with data preservation options

### Manual Setup

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your configuration (optional for local models)
nano .env

# Build and start all services
docker-compose build
docker-compose up -d

# Check status
docker-compose ps
```

## Services

Martin-Coder runs the following Docker services:

| Service | Port | Description |
|---------|------|-------------|
| **web** | 3000 | Next.js frontend (React UI) |
| **api** | 8000 | FastAPI backend (Python) |
| **postgres** | 5432 | PostgreSQL database |
| **redis** | 6379 | Redis cache |
| **sandbox** | - | Code execution sandbox |

## Management Script Commands

The `martin.sh` script provides a unified interface for all Docker operations:

```bash
# Interactive menu
./martin.sh

# Start all services
./martin.sh start

# Stop services (interactive - choose to keep or remove data)
./martin.sh stop

# Restart all services
./martin.sh restart

# Show service status and health
./martin.sh status

# View logs
./martin.sh logs          # All services
./martin.sh logs api      # Specific service

# Rebuild containers
./martin.sh build

# Clean everything (containers + data)
./martin.sh clean

# Access container shell
./martin.sh shell api      # API container
./martin.sh shell web      # Web container
./martin.sh shell postgres # PostgreSQL
./martin.sh shell redis    # Redis

# Show help
./martin.sh help
```

## Common Docker Compose Commands

If you prefer using Docker Compose directly:

```bash
# Start all services
docker-compose up -d

# Start and view logs
docker-compose up

# Stop all services
docker-compose down

# Stop and remove all data
docker-compose down -v
```

### Build and Rebuild

```bash
# Build all containers
docker-compose build

# Build specific service
docker-compose build api

# Rebuild without cache
docker-compose build --no-cache

# Rebuild and restart
docker-compose up -d --build
```

### Logs and Monitoring

```bash
# View all logs
docker-compose logs

# Follow logs (real-time)
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f web

# Last 100 lines
docker-compose logs --tail=100
```

### Service Management

```bash
# Check service status
docker-compose ps

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart api

# Stop specific service
docker-compose stop web

# Start specific service
docker-compose start web
```

### Container Access

```bash
# Access API container shell
docker-compose exec api bash

# Access Web container shell
docker-compose exec web sh

# Access PostgreSQL
docker-compose exec postgres psql -U martin -d martin_coder

# Access Redis CLI
docker-compose exec redis redis-cli
```

## Troubleshooting

### Port Already in Use

If you get "port already allocated" error:

```bash
# Check what's using the port
lsof -i :3000  # for web
lsof -i :8000  # for api

# Kill the process using the port
kill -9 <PID>

# Or change the port in .env file
FRONTEND_PORT=3001
API_PORT=8001
```

### Container Won't Start

```bash
# View container logs
docker-compose logs <service-name>

# Remove all containers and start fresh
docker-compose down -v
docker-compose up -d

# Check Docker daemon
docker info
```

### Out of Disk Space

```bash
# Clean up unused Docker resources
docker system prune

# Remove all stopped containers, unused networks, dangling images
docker system prune -a

# View disk usage
docker system df
```

### Database Connection Issues

```bash
# Check if postgres is healthy
docker-compose ps postgres

# Restart postgres
docker-compose restart postgres

# Check database logs
docker-compose logs postgres

# Connect to database to verify
docker-compose exec postgres psql -U martin -d martin_coder
```

### Build Failures

```bash
# Clear build cache
docker builder prune

# Build without cache
docker-compose build --no-cache

# Pull latest base images
docker-compose pull

# Check Docker version
docker --version
docker-compose --version
```

### Permission Issues

```bash
# Fix ownership of data directory
sudo chown -R $USER:$USER ./data

# Fix permissions
chmod -R 755 ./data
```

### Cannot Connect to Docker Daemon

```bash
# Start Docker daemon (macOS)
open -a Docker

# Start Docker daemon (Linux)
sudo systemctl start docker

# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker
```

## Environment Configuration

### Required Variables

```env
# API Keys (at least one provider)
ANTHROPIC_API_KEY=sk-ant-...      # For Claude
OPENAI_API_KEY=sk-...              # For OpenAI
LMSTUDIO_URL=http://localhost:1234/v1  # For local LM Studio
OLLAMA_URL=http://localhost:11434       # For local Ollama

# Security
SECRET_KEY=<generate-random-key>

# Database (Docker uses these defaults)
POSTGRES_PASSWORD=martin_password
```

### Generate Secret Key

```bash
# Using OpenSSL
openssl rand -hex 32

# Using Python
python -c "import secrets; print(secrets.token_hex(32))"
```

## Data Persistence

Docker volumes are used to persist data:

| Volume | Description |
|--------|-------------|
| `postgres_data` | Database data |
| `redis_data` | Redis cache |
| `sandbox_data` | Sandbox execution data |
| `./data` | ChromaDB embeddings, logs |

### Backup Data

```bash
# Backup database
docker-compose exec postgres pg_dump -U martin martin_coder > backup.sql

# Backup all volumes
docker run --rm -v martin-coder_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup.tar.gz /data
```

### Restore Data

```bash
# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U martin -d martin_coder
```

## Development vs Production

### Development Setup

Use `docker-compose.dev.yml` for development with hot-reload:

```bash
# Start in development mode
docker-compose -f docker-compose.dev.yml up

# Build dev containers
docker-compose -f docker-compose.dev.yml build
```

### Production Setup

Use regular `docker-compose.yml` for production:

```bash
# Start in production mode
docker-compose up -d

# Set production environment variables
ENVIRONMENT=production
DEBUG=false
```

## Performance Optimization

### Resource Limits

Edit `docker-compose.yml` to set resource limits:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          memory: 512M
```

### Health Checks

Services include health checks. View status:

```bash
docker-compose ps

# Healthy services show (healthy) status
```

## Networking

All services run on the `martin-network` bridge network and can communicate using service names:

- API connects to PostgreSQL: `postgresql://martin:password@postgres:5432/martin_coder`
- API connects to Redis: `redis://redis:6379/0`
- Web connects to API: `http://api:8000`

### Access from Host

From your host machine:
- Web: `http://localhost:3000`
- API: `http://localhost:8000`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## Security Considerations

1. **Change default passwords** in `.env` file
2. **Generate strong SECRET_KEY**
3. **Don't commit `.env`** to version control (already in `.gitignore`)
4. **Use HTTPS** in production with reverse proxy (nginx/traefik)
5. **Keep Docker updated**: `docker version` and `docker-compose version`
6. **Scan images**: `docker scan martin-coder-api`

## Updating

```bash
# Pull latest code
git pull

# Rebuild and restart using the management script
./martin.sh build
./martin.sh restart

# Or manually with Docker Compose
docker-compose build
docker-compose down
docker-compose up -d
```

## Clean Uninstall

```bash
# Stop and remove everything
docker-compose down -v

# Remove images
docker rmi martin-coder-api martin-coder-web martin-coder-sandbox

# Remove data directory (optional)
rm -rf ./data

# Remove environment file (optional)
rm .env
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Martin-Coder README](README.md)
- [Installation Guide](docs/en/installation.md)
