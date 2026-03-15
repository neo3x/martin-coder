# Martin-Coder

<div align="center">

![Martin-Coder Logo](docs/assets/logo.svg)

**AI-Powered Code Generation, Editing, and Debugging Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)](CHANGELOG.md)
[![Bun 1.1+](https://img.shields.io/badge/bun-1.1+-black.svg)](https://bun.sh/)
[![TypeScript 5.7](https://img.shields.io/badge/typescript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js 20+](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org/)

[English](#english) | [Español](#español)

</div>

---

## English

### Overview

Martin-Coder v2.3 is an AI-powered development platform built with **TypeScript**, **Bun**, and a modern monorepo architecture. It combines multiple LLM providers (Claude, OpenAI, Google, Ollama) with a full-featured IDE experience: code editor (Monaco), terminal (xterm), VS Code-style file explorer, and AI chat with streaming responses and deep execution traceability.

### What's New in v2.3

**Phase 2 hardening** makes MartinCoder feel safe, deliberate, and engineering-grade for real repository work:

| Capability | What it does |
|-----------|-------------|
| **File Snapshots** | Captures before/after state of every file the agent modifies |
| **Unified Diffs** | Shows exactly what changed, line by line, per file |
| **Rollback** | Restore all files from any past execution with one click |
| **Task Flow** | Real-time phase display: understanding → generating → validating → done |
| **Execution History** | Full audit trail of every action taken in a session |
| **Validation Pipeline** | Auto-runs lint/typecheck/tests/build after code changes |

### Key Features

#### 🤖 AI & Agents
- **Multi-LLM Support**: Anthropic Claude, OpenAI, Google Gemini, Ollama, LM Studio
- **Agent System**: `build` agent (full access) and `plan` agent (read-only analysis)
- **Interpretation Flow**: Request analyzed and summarized before execution — approve, refine, or cancel
- **LSP Integration**: Language Server Protocol for code intelligence
- **MCP Integration**: Model Context Protocol for extended tool capabilities

#### 🔒 Trust & Safety
- **File Snapshots**: Every file write captures a full before/after snapshot automatically
- **Rollback**: Revert any execution — files restored to exact pre-run state
- **Safety Controls**: Per-session `readOnlyMode`, `writableRoots`, command approval, deny patterns
- **Diff Viewer**: Line-by-line unified diff display per modified file
- **Execution History**: Auditable record of every action, change, and validation result

#### 🧪 Validation
- **Auto-Validation**: Runs after code changes — detects and uses ESLint, TypeScript, Vitest, Jest, pytest, build scripts
- **Toolchain Detection**: Reads project config files to choose correct commands automatically
- **Live Results**: Validation streamed in real-time with pass/fail per tool
- **Pipeline Order**: typecheck → lint → test → build (stops on hard failures)

#### 🖥️ IDE & Workspace
- **Monaco Editor**: Full code editor with syntax highlighting
- **VS Code-Style Explorer**: Collapsible file tree with type icons, click-to-open
- **Integrated Terminal**: xterm.js terminal panel
- **3-Panel Layout**: Chat / Split / Editor modes with keyboard shortcuts
- **JWT Authentication**: Secure role-based access with OAuth support
- **SQLite Database**: Zero-config, no external database server needed
- **CLI Tool**: Full command-line interface (`martin` command) with doctor, sessions, projects
- **i18n Support**: English and Spanish

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
bun run dev:web    # Web on http://localhost:3005
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
| Web UI | http://localhost:3005 |
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
FRONTEND_URL=http://your-domain:3005
CORS_ORIGINS=http://your-domain:3005

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
curl -s -o /dev/null -w "%{http_code}" http://localhost:3005

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
        proxy_pass http://localhost:3005;
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
| `FRONTEND_URL` | No | `http://localhost:3005` | Frontend URL for CORS |
| `CORS_ORIGINS` | No | `http://localhost:3005` | Allowed CORS origins |
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
| GET/PUT | `/sessions/{id}/safety` | Read/update session safety settings |
| GET/POST | `/projects` | List/create projects |
| GET | `/ai/providers` | List available AI providers |
| GET | `/ai/agents` | List available agents |
| POST | `/files/read` | Read file content |
| POST | `/files/write` | Write file content |
| POST | `/lsp/start` | Start LSP server |
| GET/POST | `/mcp/servers` | List/add MCP servers |
| GET | `/users` | User management |
| GET | `/plugins` | Plugin management |
| GET | `/executions` | List executions for a session (`?sessionId=`) |
| GET | `/executions/{id}` | Get execution detail with file diffs and validation |
| POST | `/executions/{id}/rollback` | Roll back all file changes from an execution |
| GET | `/validation/detect` | Detect available validation tools for a project |
| POST | `/validation/run` | Run validation pipeline on demand |

### SSE Stream Event Types

The `/sessions/{id}/messages` endpoint streams Server-Sent Events. New event types in v2.3:

| Event | Payload | Description |
|-------|---------|-------------|
| `text` | `{ content }` | Assistant text delta |
| `tool_call` | `{ toolName, toolArgs }` | Tool invocation |
| `tool_result` | `{ toolName, toolResult }` | Tool execution result |
| `task_status` | `{ phase, statusMessage, executionId }` | Execution phase change |
| `file_changed` | `{ snapshotId, filePath, changeType, linesAdded, linesRemoved, diffText }` | File modified |
| `validation_result` | `{ toolType, passed, errorCount, ... }` | Validation tool result |
| `finish` | `{ usage, cost }` | Stream complete |
| `error` | `{ error }` | Error occurred |

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
│   │       │   ├── sessions.ts      # Chat sessions + safety
│   │       │   ├── executions.ts    # Execution history + rollback ✨
│   │       │   └── validation.ts    # Validation pipeline ✨
│   │       ├── services/    # Business logic
│   │       │   ├── chat.ts          # Streaming + phase events
│   │       │   ├── diff.ts          # Unified diff engine ✨
│   │       │   ├── execution.ts     # Lifecycle + snapshots ✨
│   │       │   ├── validation.ts    # Toolchain detection ✨
│   │       │   └── safety.ts        # Permission model
│   │       ├── middleware/   # Auth middleware (JWT)
│   │       ├── agents/      # AI agent definitions (build/plan)
│   │       ├── providers/   # AI provider factory
│   │       ├── tools/       # Agent tool definitions (snapshot-aware)
│   │       ├── lsp/         # Language Server Protocol
│   │       └── mcp/         # Model Context Protocol
│   ├── web/                 # Next.js 14 Frontend
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   │   ├── chat/        # AI chat panel + interpretation flow
│   │   │   ├── diff/        # Diff viewer + live diff panel ✨
│   │   │   ├── execution/   # Timeline + history panel ✨
│   │   │   ├── validation/  # Validation results panel ✨
│   │   │   ├── editor/      # Monaco editor
│   │   │   ├── explorer/    # VS Code-style file explorer
│   │   │   ├── terminal/    # xterm terminal
│   │   │   └── layout/      # Header, sidebar
│   │   ├── lib/
│   │   │   ├── stores/      # Zustand state
│   │   │   │   ├── chat-store.ts
│   │   │   │   ├── execution-store.ts  # ✨ Live execution state
│   │   │   │   ├── project-store.ts
│   │   │   │   └── model-store.ts
│   │   │   └── api.ts       # API + SSE client
│   │   └── messages/        # i18n (en, es)
│   ├── cli/                 # CLI tool (martin command)
│   │   └── src/commands/    # auth, chat, projects, sessions, doctor
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
> ✨ = Added in v2.3

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

Martin-Coder v2.3 es una plataforma de desarrollo impulsada por IA construida con **TypeScript**, **Bun** y una arquitectura monorepo moderna. Combina múltiples proveedores de LLM (Claude, OpenAI, Google, Ollama) con una experiencia IDE completa: editor de código (Monaco), terminal (xterm), explorador de archivos estilo VS Code y chat con IA con streaming de respuestas y trazabilidad completa de ejecución.

### Novedades en v2.3

El **hardening de Fase 2** hace que MartinCoder se sienta seguro, deliberado y de nivel ingenieril para trabajo real con repositorios:

| Capacidad | Descripción |
|-----------|-------------|
| **Snapshots de Archivos** | Captura el estado antes/después de cada archivo que el agente modifica |
| **Diffs Unificados** | Muestra exactamente qué cambió, línea por línea, por archivo |
| **Rollback** | Restaura todos los archivos de cualquier ejecución pasada con un clic |
| **Flujo de Tareas** | Fase en tiempo real: entendiendo → generando → validando → listo |
| **Historial de Ejecuciones** | Registro de auditoría completo de cada acción en una sesión |
| **Pipeline de Validación** | Ejecuta lint/typecheck/tests/build automáticamente tras cambios de código |

### Características Principales

#### 🤖 IA y Agentes
- **Soporte Multi-LLM**: Anthropic Claude, OpenAI, Google Gemini, Ollama, LM Studio
- **Sistema de Agentes**: Agente `build` (acceso completo) y agente `plan` (análisis solo lectura)
- **Flujo de Interpretación**: La solicitud es analizada y resumida antes de ejecutarse — aprobar, refinar o cancelar
- **Integración LSP**: Language Server Protocol para inteligencia de código
- **Integración MCP**: Model Context Protocol para capacidades extendidas

#### 🔒 Confianza y Seguridad
- **Snapshots de Archivos**: Cada escritura captura un snapshot completo antes/después automáticamente
- **Rollback**: Revierte cualquier ejecución — archivos restaurados al estado exacto pre-ejecución
- **Controles de Seguridad**: Por sesión: `readOnlyMode`, `writableRoots`, aprobación de comandos, patrones de denegación
- **Visor de Diffs**: Visualización unificada línea por línea por archivo modificado
- **Historial de Ejecuciones**: Registro auditable de cada acción, cambio y resultado de validación

#### 🧪 Validación
- **Validación Automática**: Se ejecuta después de cambios de código — detecta y usa ESLint, TypeScript, Vitest, Jest, pytest, scripts de build
- **Detección de Toolchain**: Lee archivos de configuración del proyecto para elegir los comandos correctos automáticamente
- **Resultados en Tiempo Real**: Validación transmitida en vivo con éxito/fallo por herramienta
- **Orden del Pipeline**: typecheck → lint → test → build (se detiene en fallos graves)

#### 🖥️ IDE y Workspace
- **Editor Monaco**: Editor de código completo con resaltado de sintaxis
- **Explorador Estilo VS Code**: Árbol de archivos colapsable con iconos por tipo, clic para abrir
- **Terminal Integrada**: Panel de terminal xterm.js
- **Layout de 3 Paneles**: Modos Chat / Split / Editor con atajos de teclado
- **Autenticación JWT**: Acceso seguro basado en roles con soporte OAuth
- **Base de Datos SQLite**: Sin configuración, sin servidor externo necesario
- **Herramienta CLI**: Interfaz de línea de comandos completa (comando `martin`) con doctor, sessions, projects
- **Soporte i18n**: Inglés y Español

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
FRONTEND_URL=http://tu-dominio:3005
CORS_ORIGINS=http://tu-dominio:3005

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

### Nuevos Endpoints API (v2.3)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/executions` | Listar ejecuciones de una sesión (`?sessionId=`) |
| GET | `/api/v1/executions/:id` | Detalle con diffs y validaciones |
| POST | `/api/v1/executions/:id/rollback` | Revertir todos los cambios de una ejecución |
| GET/PUT | `/api/v1/sessions/:id/safety` | Leer/actualizar controles de seguridad |
| GET | `/api/v1/validation/detect` | Detectar herramientas disponibles en proyecto |
| POST | `/api/v1/validation/run` | Ejecutar pipeline de validación manualmente |

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

*Martin-Coder v2.3 - 2026*
