# Martin-Coder

<div align="center">

![Martin-Coder Logo](docs/assets/logo.svg)

**AI-Powered Code Generation, Editing, and Debugging Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun 1.1+](https://img.shields.io/badge/bun-1.1+-black.svg)](https://bun.sh/)
[![TypeScript 5.7](https://img.shields.io/badge/typescript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js 20+](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org/)

[English](#english) | [Español](#español)

</div>

---

## English

### Overview

Martin-Coder v2.0 is an AI-powered development platform built with **TypeScript**, **Bun**, and a modern monorepo architecture. It combines multiple LLM providers (Claude, OpenAI, Google, Ollama) with a full-featured IDE experience: code editor (Monaco), terminal (xterm), file explorer, and AI chat with streaming responses.

### Key Features

- **Multi-LLM Support**: Anthropic Claude, OpenAI, Google Gemini, Ollama, LM Studio
- **Modern IDE**: Monaco code editor, integrated terminal, file explorer
- **AI Agent System**: Configurable agents with tool access for code operations
- **LSP Integration**: Language Server Protocol for code intelligence
- **MCP Integration**: Model Context Protocol for extended tool capabilities
- **JWT Authentication**: Secure role-based access with OAuth support
- **SQLite Database**: Zero-config, no external database server needed
- **Plugin System**: Extensible architecture
- **i18n Support**: English and Spanish
- **CLI Tool**: Full command-line interface (`martin` command)

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Bun 1.1+ |
| **Language** | TypeScript 5.7 |
| **Backend** | Hono 4.6 (REST API) |
| **Frontend** | Next.js 14 + React 18 |
| **Database** | SQLite + Drizzle ORM |
| **AI SDKs** | Vercel AI SDK (multi-provider) |
| **UI** | Radix UI + TailwindCSS |
| **Editor** | Monaco Editor |
| **Terminal** | xterm.js |
| **Build** | Turbo 2.5 |

### System Requirements

| Requirement | Minimum Version |
|-------------|-----------------|
| Bun | 1.1+ |
| Node.js | 20+ (for Next.js) |
| Docker | 24+ (for containerized deployment) |
| Git | 2.40+ |

---

## Quick Start

### Option 1: Docker (Recommended for Production)

```bash
# Clone the repository
git clone https://github.com/neo3x/martin-coder.git
cd martin-coder

# Copy environment configuration
cp .env.example .env

# Edit .env - at minimum set SECRET_KEY and API keys
# nano .env

# Start with the management script
./martin.sh start      # Linux/macOS
martin.bat start       # Windows

# Or use Docker Compose directly
docker compose up -d
```

### Option 2: Local Development (Bun)

```bash
# Clone the repository
git clone https://github.com/neo3x/martin-coder.git
cd martin-coder

# Install dependencies
bun install

# Copy environment configuration
cp .env.example .env
# Edit .env with your API keys

# Start all services in dev mode
bun run dev

# Or start individually
bun run dev:api    # API on http://localhost:8000
bun run dev:web    # Web on http://localhost:3000
bun run dev:cli    # CLI in watch mode
```

### Option 3: Management Script (Full Control)

```bash
# Interactive menu (no arguments)
./martin.sh           # Linux/macOS
martin.bat            # Windows

# Or use direct commands
./martin.sh start     # Start with smart rebuild
./martin.sh dev       # Local Bun dev mode (no Docker)
./martin.sh dev api   # Dev mode for API only
./martin.sh sync      # Rebuild changed services
./martin.sh status    # Health checks + quick actions
./martin.sh logs api  # View service logs
./martin.sh test      # Run all tests
./martin.sh lint      # Run linter
./martin.sh db migrate  # Database migrations
./martin.sh shell api # Container shell access
./martin.sh help      # All available commands
```

### Access Points

| Service | URL |
|---------|-----|
| Web UI | http://localhost:3000 |
| API | http://localhost:8000 |
| API Health | http://localhost:8000/health |
| OpenAPI Spec | http://localhost:8000/openapi.json |

---

## Deployment Guide

### Production Deployment with Docker

#### Prerequisites
- Docker 24+ and Docker Compose v2+
- At least 2GB RAM available
- An AI provider API key (Anthropic, OpenAI, or Google)

#### Step 1: Clone and Configure

```bash
git clone https://github.com/neo3x/martin-coder.git
cd martin-coder
cp .env.example .env
```

#### Step 2: Edit Environment Variables

Edit `.env` with your production values:

```bash
# REQUIRED: Change this to a strong random key (min 32 characters)
SECRET_KEY=your-strong-random-secret-key-at-least-32-chars

# REQUIRED: At least one AI provider API key
ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# GOOGLE_GENERATIVE_AI_API_KEY=AIza...

# Server settings
PORT=8000
NODE_ENV=production
FRONTEND_URL=http://your-domain:3000
CORS_ORIGINS=http://your-domain:3000

# Database (SQLite - stored in Docker volume)
DATABASE_PATH=/data/martin-coder.db

# Initial admin user
FIRST_ADMIN_EMAIL=admin@your-domain.com
FIRST_ADMIN_PASSWORD=your-strong-admin-password
```

#### Step 3: Build and Start

```bash
# Build containers
docker compose build

# Start in detached mode
docker compose up -d

# Verify services are running
docker compose ps

# Check health
curl http://localhost:8000/health
```

#### Step 4: Verify Deployment

```bash
# Check API is responding
curl -s http://localhost:8000/health | jq .

# Check web UI
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

# View logs
docker compose logs -f
```

### Production with Reverse Proxy (Nginx)

For production deployments behind Nginx:

```nginx
# /etc/nginx/sites-available/martin-coder
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Web UI
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Health
    location /health {
        proxy_pass http://localhost:8000/health;
    }

    # SSE (Server-Sent Events for AI streaming)
    location /api/v1/sessions/ {
        proxy_pass http://localhost:8000/api/v1/sessions/;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
    }
}
```

### Development Deployment with Docker

For development with hot-reload:

```bash
# Use the dev compose file
docker compose -f docker-compose.dev.yml up -d

# Or use the management script
./martin.sh start   # Uses docker-compose.yml (production)
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | Yes | - | JWT signing key (min 32 chars) |
| `PORT` | No | `8000` | API server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `DATABASE_PATH` | No | `./data/martin-coder.db` | SQLite database path |
| `FRONTEND_URL` | No | `http://localhost:3000` | Frontend URL for CORS |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Allowed CORS origins |
| `ANTHROPIC_API_KEY` | No* | - | Anthropic Claude API key |
| `OPENAI_API_KEY` | No* | - | OpenAI API key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | No* | - | Google Gemini API key |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Ollama server URL |
| `LMSTUDIO_BASE_URL` | No | `http://localhost:1234/v1` | LM Studio URL |
| `DEFAULT_AI_PROVIDER` | No | `anthropic` | Default AI provider |
| `DEFAULT_AI_MODEL` | No | `claude-sonnet-4-5-20250929` | Default model |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `30` | JWT access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | JWT refresh token TTL |
| `FIRST_ADMIN_EMAIL` | No | `admin@example.com` | Initial admin email |
| `FIRST_ADMIN_PASSWORD` | No | - | Initial admin password |
| `LSP_ENABLED` | No | `true` | Enable LSP support |
| `MCP_ENABLED` | No | `true` | Enable MCP support |
| `LOG_LEVEL` | No | `info` | Log level |

> *At least one AI provider API key is required for AI features to work. For local-only usage, configure Ollama or LM Studio.

---

## Management Script Commands

Both `martin.sh` (Linux/macOS) and `martin.bat` (Windows) support identical commands:

### Docker Commands

| Command | Description |
|---------|-------------|
| `start` | Start services with smart rebuild detection |
| `stop` | Stop services (interactive - keep/remove data) |
| `restart` | Restart with smart rebuild if changes detected |
| `status` | Container status + health checks + quick actions |
| `logs [service]` | Tail logs (optionally filter by service) |
| `build` | Force rebuild all containers |
| `sync` | Smart rebuild only changed services |
| `clean` | Remove containers, volumes, networks, build artifacts |
| `shell <api\|web>` | Open shell in service container |

### Development Commands

| Command | Description |
|---------|-------------|
| `dev [api\|web\|cli]` | Local Bun dev mode (no Docker needed) |
| `test [package]` | Run tests via turbo |
| `lint [package]` | Run linter via turbo |
| `db migrate` | Push schema changes to SQLite |
| `db generate` | Generate migration SQL files |
| `db studio` | Open Drizzle Studio (DB browser) |
| `db reset` | Delete and recreate database |
| `update` | Git pull + install deps + rebuild |
| `info` | Show stack details and project info |

---

## API Endpoints

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (status, version, uptime) |
| GET | `/openapi.json` | OpenAPI 3.0 specification |

### Authentication (prefix: `/api/v1`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login (returns JWT tokens) |

### Protected Endpoints (prefix: `/api/v1`, requires Bearer token)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/sessions` | List/create chat sessions |
| POST | `/sessions/{id}/messages` | Send message (SSE streaming) |
| GET/POST | `/projects` | List/create projects |
| GET | `/ai/providers` | List available AI providers |
| GET | `/ai/agents` | List available agents |
| POST | `/files/read` | Read file content |
| POST | `/files/write` | Write file content |
| POST | `/lsp/start` | Start LSP server |
| GET/POST | `/mcp/servers` | List/add MCP servers |
| GET | `/users` | User management |
| GET | `/plugins` | Plugin management |

---

## Project Structure

```
martin-coder/
├── packages/
│   ├── api/                 # Hono REST API (Bun)
│   │   └── src/
│   │       ├── index.ts     # Server entry point
│   │       ├── db/          # SQLite + Drizzle schema
│   │       ├── routes/      # API route handlers
│   │       ├── services/    # Business logic
│   │       ├── middleware/   # Auth middleware (JWT)
│   │       ├── agents/      # AI agent definitions
│   │       ├── providers/   # AI provider factory
│   │       ├── tools/       # Agent tool definitions
│   │       ├── lsp/         # Language Server Protocol
│   │       └── mcp/         # Model Context Protocol
│   ├── web/                 # Next.js 14 Frontend
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   │   ├── chat/        # AI chat panel
│   │   │   ├── editor/      # Monaco editor
│   │   │   ├── terminal/    # xterm terminal
│   │   │   ├── drive/       # File explorer
│   │   │   └── layout/      # Header, sidebar
│   │   ├── lib/             # Stores, API clients, types
│   │   └── messages/        # i18n (en, es)
│   ├── cli/                 # CLI tool (martin command)
│   │   └── src/commands/    # auth, chat, projects, sessions
│   └── shared/              # Shared types & constants
│       └── src/
│           ├── types.ts     # All shared TypeScript types
│           └── constants.ts # Shared constants
├── docker/                  # Dockerfiles (prod & dev)
├── martin.sh                # Management script (Linux/macOS)
├── martin.bat               # Management script (Windows)
├── docker-compose.yml       # Production compose
├── docker-compose.dev.yml   # Development compose
├── turbo.json               # Turbo build config
├── tsconfig.json            # Root TypeScript config
├── package.json             # Workspace root (Bun)
└── .env.example             # Environment template
```

---

## Supported AI Providers

| Provider | Models | Type | API Key Required |
|----------|--------|------|------------------|
| Anthropic | Claude Sonnet 4.5, Claude Opus, Claude Haiku | Cloud | Yes |
| OpenAI | GPT-4o, GPT-4-turbo, GPT-3.5-turbo | Cloud | Yes |
| Google | Gemini Pro, Gemini Flash | Cloud | Yes |
| Ollama | Any loaded model (CodeLlama, DeepSeek, etc.) | Local | No |
| LM Studio | Any loaded model | Local | No |

---

## Troubleshooting

### Common Issues

**API not starting:**
```bash
# Check logs
docker compose logs api
# or
./martin.sh logs api

# Verify .env exists and has valid SECRET_KEY
cat .env | grep SECRET_KEY
```

**Database errors:**
```bash
# Reset the database
./martin.sh db reset

# Or manually
rm -f data/martin-coder.db
docker compose restart api
```

**Port conflicts:**
```bash
# Change ports in .env
PORT=8001            # API port
FRONTEND_PORT=3001   # Web port

# Restart
docker compose down && docker compose up -d
```

**Build failures:**
```bash
# Clean and rebuild
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

---

## License

MIT License - see [LICENSE](LICENSE)

---

## Español

### Descripción General

Martin-Coder v2.0 es una plataforma de desarrollo impulsada por IA construida con **TypeScript**, **Bun** y una arquitectura monorepo moderna. Combina múltiples proveedores de LLM (Claude, OpenAI, Google, Ollama) con una experiencia IDE completa: editor de código (Monaco), terminal (xterm), explorador de archivos y chat con IA con respuestas en streaming.

### Características Principales

- **Soporte Multi-LLM**: Anthropic Claude, OpenAI, Google Gemini, Ollama, LM Studio
- **IDE Moderno**: Editor Monaco, terminal integrada, explorador de archivos
- **Sistema de Agentes IA**: Agentes configurables con acceso a herramientas
- **Integración LSP**: Language Server Protocol para inteligencia de código
- **Integración MCP**: Model Context Protocol para capacidades extendidas
- **Autenticación JWT**: Acceso seguro basado en roles con soporte OAuth
- **Base de Datos SQLite**: Sin configuración, sin servidor externo necesario
- **Sistema de Plugins**: Arquitectura extensible
- **Soporte i18n**: Inglés y Español
- **Herramienta CLI**: Interfaz de línea de comandos completa (comando `martin`)

### Inicio Rápido

#### Con Docker (Recomendado para Producción)

```bash
# Clonar el repositorio
git clone https://github.com/neo3x/martin-coder.git
cd martin-coder

# Copiar configuración
cp .env.example .env
# Editar .env con tus API keys

# Iniciar con el script de gestión
./martin.sh start      # Linux/macOS
martin.bat start       # Windows
```

#### Desarrollo Local (Bun)

```bash
# Clonar e instalar
git clone https://github.com/neo3x/martin-coder.git
cd martin-coder
bun install

# Configurar
cp .env.example .env

# Iniciar en modo desarrollo
bun run dev
```

### Guía de Deploy

#### Paso 1: Configurar Variables de Entorno

```bash
cp .env.example .env
```

Editar `.env` con valores de producción:

```bash
# OBLIGATORIO: Clave secreta (mínimo 32 caracteres)
SECRET_KEY=tu-clave-secreta-fuerte-minimo-32-caracteres

# OBLIGATORIO: Al menos una API key de proveedor IA
ANTHROPIC_API_KEY=sk-ant-...

# Configuración del servidor
NODE_ENV=production
FRONTEND_URL=http://tu-dominio:3000
CORS_ORIGINS=http://tu-dominio:3000

# Usuario admin inicial
FIRST_ADMIN_EMAIL=admin@tu-dominio.com
FIRST_ADMIN_PASSWORD=tu-password-seguro
```

#### Paso 2: Construir e Iniciar

```bash
docker compose build
docker compose up -d
```

#### Paso 3: Verificar

```bash
# Verificar salud del API
curl http://localhost:8000/health

# Ver logs
docker compose logs -f
```

### Comandos del Script de Gestión

```bash
# Menú interactivo
./martin.sh

# Comandos Docker
./martin.sh start       # Iniciar con smart rebuild
./martin.sh stop        # Detener servicios
./martin.sh restart     # Reiniciar
./martin.sh status      # Estado y salud
./martin.sh logs api    # Ver logs de un servicio
./martin.sh sync        # Reconstruir lo que cambió
./martin.sh build       # Reconstruir todo

# Comandos de Desarrollo
./martin.sh dev         # Modo dev local con Bun
./martin.sh dev api     # Solo el API
./martin.sh test        # Ejecutar tests
./martin.sh lint        # Ejecutar linter
./martin.sh db migrate  # Migraciones de BD
./martin.sh db studio   # Explorador de BD
./martin.sh update      # Actualizar proyecto
./martin.sh info        # Info del proyecto
./martin.sh help        # Todos los comandos
```

### Requisitos del Sistema

| Requisito | Versión Mínima |
|-----------|----------------|
| Bun | 1.1+ |
| Node.js | 20+ (para Next.js) |
| Docker | 24+ (para deploy con contenedores) |
| Git | 2.40+ |

### Proveedores de IA Soportados

| Proveedor | Modelos | Tipo |
|-----------|---------|------|
| Anthropic | Claude Sonnet 4.5, Claude Opus, Claude Haiku | Nube |
| OpenAI | GPT-4o, GPT-4-turbo, GPT-3.5-turbo | Nube |
| Google | Gemini Pro, Gemini Flash | Nube |
| Ollama | Cualquier modelo cargado | Local |
| LM Studio | Cualquier modelo cargado | Local |

### Licencia

Licencia MIT - ver [LICENSE](LICENSE)

---

## Contributing

Contributions are welcome! Open an issue or submit a pull request on GitHub.

## Support

- [GitHub Issues](https://github.com/neo3x/martin-coder/issues)
- [Discussions](https://github.com/neo3x/martin-coder/discussions)

---

## Contributors / Contribuidores

**Project Maintainer / Mantenedor del Proyecto:**
- **Francisco Ortiz** - Dev-ops Marfinex
  - Email: francisco.ortiz@marfinex.com

---

*Martin-Coder v2.0 - 2026*
