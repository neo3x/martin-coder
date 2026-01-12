# Martin.sh - Unified Management Script

Complete guide for the Martin-Coder management script.

## Overview

`martin.sh` is a unified Bash script that simplifies all Docker operations for Martin-Coder. It replaces multiple separate scripts with a single, easy-to-use interface.

## Features

- **Interactive Menu**: Run without arguments for a user-friendly menu
- **Command-Line Interface**: Direct commands for automation and scripting
- **Docker Detection**: Automatically detects `docker compose` or `docker-compose`
- **Health Checks**: Tests API and Web UI endpoints
- **Resource Monitoring**: Shows CPU and memory usage
- **Color-Coded Output**: Easy to read status messages
- **Safe Operations**: Confirmations for destructive actions

## Quick Start

```bash
# Make executable (first time only)
chmod +x martin.sh

# Interactive menu
./martin.sh

# Or use direct commands
./martin.sh start
```

## Available Commands

### start
Start all services (builds containers if needed, creates .env)

```bash
./martin.sh start
```

**What it does:**
1. Checks Docker and Docker Compose are installed
2. Creates `.env` from `.env.example` if missing
3. Offers to edit `.env` file
4. Stops existing containers
5. Builds all containers
6. Starts all services
7. Shows service status and URLs
8. Optionally displays logs

### stop
Interactive stop with options to preserve or remove data

```bash
./martin.sh stop
```

**Options:**
1. Stop services (keep data)
2. Stop and remove everything (containers + volumes + data)
3. Cancel

### restart
Restart all running services

```bash
./martin.sh restart
```

### status
Show comprehensive service status

```bash
./martin.sh status
```

**Shows:**
- Container status (running/stopped)
- Service URLs
- Health checks (API and Web UI)
- Resource usage (CPU, memory)
- Quick action menu

**Interactive options:**
- `[l]` View logs
- `[r]` Restart services
- `[s]` Stop services
- `[q]` Quit

### logs
View service logs

```bash
# All services
./martin.sh logs

# Specific service
./martin.sh logs api
./martin.sh logs web
./martin.sh logs postgres
./martin.sh logs redis
```

Press `Ctrl+C` to exit log viewing.

### build
Rebuild all containers

```bash
./martin.sh build
```

Use this after pulling code changes or modifying Dockerfiles.

### clean
Complete cleanup (containers + volumes + networks)

```bash
./martin.sh clean
```

**Warning:** This removes ALL data including databases. Requires typing "yes" to confirm.

### shell
Access container shell/CLI

```bash
# API container (bash)
./martin.sh shell api

# Web container (sh)
./martin.sh shell web

# PostgreSQL (psql)
./martin.sh shell postgres

# Redis (redis-cli)
./martin.sh shell redis
```

### help
Show help and usage information

```bash
./martin.sh help
# or
./martin.sh --help
./martin.sh -h
```

## Interactive Menu

Run without arguments to see the interactive menu:

```bash
./martin.sh
```

**Menu Options:**
1. Start services
2. Stop services
3. Restart services
4. Show status
5. View logs
6. Build containers
7. Clean all data
8. Help
9. Exit

## Examples

### First-Time Setup

```bash
# Clone repository
git clone https://github.com/neo3x/martin-coder.git
cd martin-coder

# Start services (creates .env, builds, starts)
./martin.sh start

# Check status
./martin.sh status
```

### Daily Development

```bash
# Start services
./martin.sh start

# View API logs while developing
./martin.sh logs api

# Access API container to run commands
./martin.sh shell api

# Restart after code changes
./martin.sh restart
```

### Troubleshooting

```bash
# Check service status and health
./martin.sh status

# View all logs for errors
./martin.sh logs

# Rebuild containers (clean build)
./martin.sh build

# Complete reset
./martin.sh clean
./martin.sh start
```

### Updating Application

```bash
# Pull latest code
git pull

# Rebuild and restart
./martin.sh build
./martin.sh restart

# Verify everything is working
./martin.sh status
```

## Environment Variables

The script respects environment variables from `.env`:

```env
API_PORT=8000
FRONTEND_PORT=3000
POSTGRES_PORT=5432
REDIS_PORT=6379
```

## Exit Codes

- `0`: Success
- `1`: Error (with error message)

## Color Codes

- 🔵 Blue: Information
- 🟢 Green: Success
- 🟡 Yellow: Warning
- 🔴 Red: Error
- 🔷 Cyan: Headers/Titles

## Requirements

- **Bash**: Version 4.0+
- **Docker**: Version 24+
- **Docker Compose**: V2 or docker-compose V1

The script automatically detects and uses the correct Docker Compose command.

## Automation & CI/CD

Use direct commands for automation:

```bash
# CI/CD pipeline example
./martin.sh start
./martin.sh status
# Run tests...
./martin.sh logs api > api.log
./martin.sh stop
```

## Tips & Best Practices

### 1. First Time Setup
Always run `./martin.sh start` for first-time setup. It handles .env creation and offers to edit it.

### 2. Check Status Regularly
Use `./martin.sh status` to monitor service health and resource usage.

### 3. View Logs for Debugging
When something goes wrong, check logs:
```bash
./martin.sh logs api    # Backend issues
./martin.sh logs web    # Frontend issues
```

### 4. Clean Rebuilds
If containers behave strangely:
```bash
./martin.sh clean
./martin.sh start
```

### 5. Safe Stops
Use `./martin.sh stop` instead of `docker-compose down -v` to avoid accidentally deleting data.

### 6. Shell Access
Quickly access containers for debugging:
```bash
./martin.sh shell api      # Run Python commands
./martin.sh shell postgres # Query database
```

### 7. Resource Monitoring
Check if services are using too much CPU/memory:
```bash
./martin.sh status
# Then select [l] to view detailed logs
```

## Troubleshooting

### Script Won't Run
```bash
# Make executable
chmod +x martin.sh

# Check if bash is available
which bash

# Run with bash explicitly
bash martin.sh start
```

### Docker Not Found
```bash
# Check Docker installation
docker --version
docker compose version
```

Install Docker from: https://docs.docker.com/get-docker/

### Permission Denied
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker

# Or run with sudo (not recommended)
sudo ./martin.sh start
```

### Services Won't Start
```bash
# Check what's using the ports
lsof -i :3000  # Web
lsof -i :8000  # API

# View detailed logs
./martin.sh logs

# Try clean start
./martin.sh clean
./martin.sh start
```

## Script Structure

```
martin.sh
├── Color definitions
├── Helper functions
│   ├── print_* (output formatting)
│   ├── command_exists (dependency checking)
│   └── detect_docker_compose (Docker Compose detection)
├── Main commands
│   ├── start_services
│   ├── stop_services
│   ├── restart_services
│   ├── show_status
│   ├── view_logs
│   ├── build_containers
│   ├── clean_all
│   └── access_shell
└── Main entry point
    ├── Interactive menu (no args)
    └── Command dispatcher (with args)
```

## Contributing

Found a bug or want to add a feature? The script is designed to be easily extensible.

1. Add your function following the naming convention
2. Add color-coded output for consistency
3. Add error handling with `set -e`
4. Update the help text
5. Test thoroughly

## Service URLs

After starting services with `./martin.sh start`:

- **Web UI**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Quick Reference Card

```bash
./martin.sh              # Interactive menu
./martin.sh start        # Start everything
./martin.sh stop         # Stop with options
./martin.sh restart      # Restart all
./martin.sh status       # Check health
./martin.sh logs [svc]   # View logs
./martin.sh build        # Rebuild
./martin.sh clean        # Remove all
./martin.sh shell <svc>  # Container access
./martin.sh help         # Show help
```

---

**Martin-Coder Project - 2025**
