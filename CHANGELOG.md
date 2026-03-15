# Changelog / Registro de Cambios

[English](#english) | [Español](#español)

---

<a name="english"></a>
## 🇬🇧 English

All notable changes to the Martin-Coder project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.3.0] - 2026-03-15 — Phase 2: Trust, Traceability & Validation Hardening

> **PR #26** — Production-grade functional hardening pass. No cosmetic changes — pure depth, safety, and engineering-grade behavior.

### ✅ TRUST — Diff / Review / Rollback / Snapshots

#### File Snapshot System
- Every `writeFile` and `editFile` tool call now captures before/after file content automatically
- Snapshots stored in new `file_snapshots` DB table with full diff text, lines added/removed, change type
- Change types tracked: `created`, `modified`, `deleted`

#### Unified Diff Engine (`services/diff.ts`)
- Pure TypeScript LCS-based diff algorithm — no external dependencies
- Produces structured `DiffHunk[]` with 3-line context windows
- Outputs unified diff text compatible with standard diff format
- File-level diff summaries: lines added, lines removed, hunk count

#### Execution Lifecycle & Rollback (`services/execution.ts`)
- Every user request creates a tracked `Execution` record with unique ID
- Full lifecycle: `understanding → scanning → reading → generating → applying → validating → completed/failed/rolled_back`
- `rollbackExecution()` restores all files to their pre-execution state atomically
- Rollback correctly handles: delete newly created files, restore modified files, recreate deleted files

#### New API Routes
- `GET /api/v1/executions?sessionId=:id` — list all executions for a session
- `GET /api/v1/executions/:id` — get execution detail with snapshots + validation results
- `POST /api/v1/executions/:id/rollback` — roll back all file changes from an execution
- `GET /api/v1/validation/detect?projectId=:id` — detect available validation tools
- `POST /api/v1/validation/run` — run validation pipeline on demand

### 🔍 TRACEABILITY — Task Flow / Session Memory / Execution History

#### Real-Time Phase Streaming
- `chat.ts` emits `task_status` SSE events at every execution stage
- New stream event types: `task_status`, `file_changed`, `validation_result`
- Frontend execution store (`execution-store.ts`) wires all events to live UI state

#### ExecutionTimeline Component
- Visual step-through timeline displayed in chat panel during active execution
- Shows current phase with animated spinner, completed steps with checkmarks
- File count badge updates live as files are modified

#### HistoryPanel Component
- Per-session execution history with phase badge, file count, validation status
- Detail view: per-file diffs with inline DiffViewer, validation results per tool
- Rollback button with confirmation — shows restored file count and any errors

#### New DB Tables
- `executions` — full execution record (phase, agent, files changed, validation outcome)
- `file_snapshots` — before/after content + unified diff per file per execution
- `validation_results` — per-tool validation output (exit code, stdout, stderr, counts)

### 🧪 VALIDATION — Post-Change Verification Pipeline

#### Toolchain-Aware Detection (`services/validation.ts`)
- Detects available tools from project config files automatically:
  - **TypeScript**: `tsconfig.json` → `tsc --noEmit`
  - **ESLint**: `.eslintrc.*` / `eslint.config.*` → `npm run lint` or `npx eslint`
  - **Biome**: `biome.json` → `npx biome check`
  - **Vitest** / **Jest**: detected from `devDependencies`
  - **pytest**: detected from `pytest.ini` / `pyproject.toml`
  - **Build**: from `package.json` `scripts.build`
- Runs tools sequentially: typecheck → lint → test → build
- Stops pipeline early on typecheck or lint hard failures

#### Validation Results
- Each tool result persisted to `validation_results` table
- Results streamed live to frontend via SSE
- Validation summary appended to assistant message in chat
- `ValidationPanel` component: collapsible cards per tool, error output preview

### 🖥️ UI Components Added

| Component | Purpose |
|-----------|---------|
| `components/execution/execution-timeline.tsx` | Live phase progress bar |
| `components/execution/history-panel.tsx` | Full execution history + rollback |
| `components/diff/diff-viewer.tsx` | Syntax-colored unified diff table |
| `components/diff/live-diff-panel.tsx` | Right-side panel: files changed + validation |
| `components/validation/validation-panel.tsx` | Per-tool pass/fail cards |
| `lib/stores/execution-store.ts` | Zustand store for all execution state |

### Changed
- `chat-store.ts` — handles new `task_status`, `file_changed`, `validation_result` stream events
- `chat-panel.tsx` — integrates timeline bar, History/Changes toolbar buttons, side panels
- `tools/index.ts` — `writeFile` and `editFile` now snapshot + diff before every write
- `shared/types.ts` — added `Execution`, `FileSnapshot`, `ValidationResult`, `FileDiffSummary`, `ValidationReport` types

---

## [2.2.0] - 2026-03-15 — Production-Grade Full Rebuild (PR #25)

> **PR #25** — Complete visual and product-facing reconstruction of the platform. New landing pages, stronger public presentation, improved workspace layout, VS Code-style file explorer, and interpretation/approval flow.

### ✨ Landing & Marketing Pages

- **Hero section** rebuilt: gradient text, radial glow, animated product mockup
- **Feature grid**: 8 capabilities with icons and descriptions
- **How-it-works**: 3-step flow section
- **Stats section**, use-cases grid, FAQ accordion, final CTA
- `/features` page rebuilt with rich sections and comparison table
- `/pricing` page rebuilt: billing toggle, full feature lists, FAQ
- `/product` page rebuilt: mission, pillars, tech stack, architecture diagram
- `/login` page redesigned with branded header and centered layout
- New `SiteFooter` component (4-column layout) across all public pages
- `SiteHeader` rebuilt with mobile hamburger menu and active link states

### 🖥️ Workspace Layout

- **3-panel layout modes**: Chat / Split / Editor — toggled from toolbar
- **Keyboard shortcuts**: `Ctrl+E` for editor panel, `Ctrl+\`` for terminal
- Better loading and auth states with branded spinner
- Panel toolbar with clear mode buttons

### 📂 VS Code-Style File Explorer

- New `FileExplorer` component with collapsible folder tree
- Depth-based indentation, smooth expand/collapse with chevron animation
- File type icons with color coding: TS=blue, JS=amber, JSON=orange, etc.
- Special icons for `package.json`, `.env`, `Dockerfile`, `tsconfig`, etc.
- Click-to-open files synced with Monaco editor
- Skeleton loading, error, and empty states

### 💬 Sidebar Redesign

- Three-tab sidebar: **Sessions | Explorer | Projects**
- Sessions tab: search bar + session list with navigation
- Explorer tab: VS Code-style file tree
- Projects tab: project list with path display, new project form, GitHub link
- Auto-switches to Explorer tab when a project is selected

### 🔒 Safety Controls (PR #24 included here)

- `SessionSafetySettings` model: `readOnlyMode`, `requireApprovalForCommands`, `writableRoots`, `allowCommandPatterns`, `denyCommandPatterns`
- Safety settings persisted per session in DB (`safety_settings` JSON column)
- `GET/PUT /api/v1/sessions/:id/safety` endpoints for reading and updating
- Tools enforce safety at execution time (read-only blocks all writes, writable roots restrict paths)
- Default deny list: `rm -rf`, `sudo`, `shutdown`, `reboot`, `mkfs`, `dd if=`, `chmod -R 777 /`

### 🛠️ CLI Improvements (PR #23/#24)

- `martin doctor` command — environment health check (Bun version, API connectivity, API keys configured)
- `martin sessions` command — list, view, and delete chat sessions from CLI
- Extended API client (`cli/src/api.ts`) with session management methods

### Interpretation/Approval Flow

- `InterpretationPanel` component — shows parsed intent before execution
- Detects: create, debug, refactor, review, delete, test actions
- Shows: summary, scope, likely affected files, risks, assumptions
- User can Approve & Execute / Refine prompt / Cancel

### Added
- `docs/REBUILD_AUDIT.md` — audit document for the rebuild scope

---

## [2.0.1] - 2026-02-23 — Limpieza de código deprecado

### Removed

- **`apps/api/`** — API Python/FastAPI eliminada. Reemplazada por `packages/api/` (TypeScript/Bun/Hono).
- **`apps/web/`** — Frontend antiguo sin componentes actualizados. Reemplazado por `packages/web/`.
- **`apps/cli/`** — CLI Python eliminada. Reemplazada por `packages/cli/` (TypeScript).
- **`_python_backup/`** — Backup completo del stack Python v1.x eliminado. El historial queda disponible en git.
- Total: **242 archivos eliminados** (106 de `_python_backup/`, 136 de `apps/`).

---

## [2.0.0] - 2026-02-19 — Complete TypeScript Rewrite

> **Breaking change**: Full rewrite from Python/FastAPI to TypeScript/Bun.
> Python code preserved in `_python_backup/` for reference.

### ⚡ Architecture — Total Migration

- **Runtime**: Python → **Bun** (TypeScript-native, 3-5x faster startup)
- **HTTP Framework**: FastAPI → **Hono** (ultra-fast, type-safe, OpenAPI-ready)
- **Database**: PostgreSQL + Redis → **SQLite** (via Drizzle ORM, zero infrastructure dependencies)
- **AI SDK**: LangChain (Python) → **Vercel AI SDK** (TypeScript-first, 75+ providers)
- **Monorepo**: Single repo → **Bun workspaces + Turbo** pipeline
- **Package structure**: `apps/` → `packages/` (api, web, cli, shared)

### ✨ New Features — Feature parity with opencode

#### Agent System
- Added structured **build agent** — full access: read/write files, execute bash, git operations, web search
- Added structured **plan agent** — read-only: analyze, search, review (no writes, no execution)
- Agents are selectable per session; defaults to `build`
- Custom agent definition support via config

#### LSP Integration (Language Server Protocol)
- `LSPManager` class managing server lifecycles
- Support for **TypeScript** (`typescript-language-server`), **Python** (`pyright`), **Rust** (`rust-analyzer`), **Go** (`gopls`)
- REST endpoints: `/api/v1/lsp/diagnostics`, `/completions`, `/hover`, `/definition`
- Real-time error/warning diagnostics per file
- Auto-detects installed LSP servers; graceful fallback when unavailable

#### MCP Support (Model Context Protocol)
- `MCPManager` class for registering/managing MCP servers
- REST endpoints: `/api/v1/mcp/servers`, `/mcp/tools`, `/mcp/tools/:server/:tool`
- Connect any MCP-compatible tool server
- Standard protocol — compatible with Claude Desktop, opencode, and any MCP client

#### AI Providers — Expanded
| Provider | Before | After |
|---|---|---|
| Anthropic Claude | ✅ | ✅ claude-opus-4-6, sonnet-4-5, haiku-4-5 |
| OpenAI | ✅ | ✅ gpt-4o, gpt-4-turbo, gpt-3.5-turbo |
| **Google Gemini** | ❌ | ✅ gemini-2.0-flash, gemini-1.5-pro |
| Ollama | ✅ | ✅ improved, auto-detect models |
| LM Studio | ✅ | ✅ OpenAI-compatible endpoint |
| 70+ via AI SDK | ❌ | ✅ any provider supported by ai package |

#### Session Management (replaces "chats")
- Auto-compaction at **90% context limit** — summarizes older messages automatically, never loses context
- Per-session **cost tracking in USD** (not just tokens)
- Multiple parallel sessions supported
- Session persistence in SQLite with full message history
- `POST /api/v1/sessions/:id/messages` streams via SSE (Server-Sent Events)

#### Cost Tracking
- Every message tracks `costUsd` (input + output cost)
- Session-level `totalCost` accumulates automatically
- Cost calculation per model (accurate pricing tables)

#### Tool System — Expanded
- `readFile`, `writeFile`, `editFile`, `listDirectory`, `searchFiles`
- `executeBash` — 30+ blocked dangerous patterns, path validation
- `gitStatus`, `gitDiff`, `gitCommit`, `gitLog`
- `installDependencies` — injection-safe with package name validation
- `webSearch` — web search integration
- `codeSearch` — semantic search across project files

#### OpenAPI Spec
- Auto-generated OpenAPI 3.0 spec at `GET /openapi.json`
- All routes documented with request/response schemas
- Generated from Hono route definitions (always in sync)

### 🗃️ Database Changes

- **Removed**: PostgreSQL, Redis, ChromaDB (zero external dependencies)
- **Added**: SQLite via Drizzle ORM (file at `./data/martin-coder.db`)
- **Renamed**: `chats` table → `sessions` (with `agentName`, `totalCost`, `autoCompacted` fields)
- **Added**: `messages.costUsd` column
- **Added**: `plugins` table
- Schema migrations managed by Drizzle Kit

### 📦 New Packages

- **`@martin-coder/api`** — Hono + Bun server (replaces `apps/api` Python)
- **`@martin-coder/shared`** — Shared TypeScript types used by all packages
- **`@martin-coder/cli`** — TypeScript CLI (replaces `apps/cli` Python)
- **`packages/web`** — Next.js (migrated from `apps/web`, updated API client)

### 🔧 Infrastructure Changes

- **Removed**: Docker required for running (now optional for deployment only)
- **Added**: `bun install && bun dev` — single command to start everything
- **Added**: `turbo.json` — parallel builds, caching, task orchestration
- **Added**: `package.json` root workspace config
- **Added**: `tsconfig.json` root TypeScript config (strict mode)
- **Updated**: `.env.example` — simplified, PostgreSQL/Redis vars removed

### 🗂️ Python Backup

> **Nota:** `_python_backup/` fue eliminado en v2.0.1. Historial disponible en git.

~~All Python code preserved at `_python_backup/`:~~
~~- `_python_backup/api/` — FastAPI backend~~
~~- `_python_backup/cli/` — Python CLI~~
~~- `_python_backup/docker-compose.yml` — original Docker configuration~~

### Changed

- `apps/web` → `packages/web` (path change only, no code changes)
- API base URL unchanged: `http://localhost:8000/api/v1`
- All existing API endpoints preserved with same signatures
- Auth flow (JWT, OAuth) unchanged from user perspective

---

## [1.2.0] - 2026-02-14

### Security

#### Critical Fixes
- **SEC-01 - API Key Encryption**: Added Fernet-based encryption utility (`app/core/encryption.py`) for encrypting sensitive data at rest (API keys, tokens) using a key derived from SECRET_KEY
- **SEC-02 - OAuth Token Exposure**: Moved OAuth callback tokens from URL query parameters to HttpOnly cookies with `secure`, `samesite=lax`, and scoped `path` attributes — tokens no longer appear in browser history, logs, or Referer headers
- **SEC-03 - Rate Limiting**: Added `RATE_LIMIT_DEFAULT` and `RATE_LIMIT_AUTH` configuration fields for rate limiting via Redis
- **SEC-04 - Sandbox Escape**: Removed `privileged: true` and Docker socket mount from sandbox container; added `security_opt: no-new-privileges`, `cap_drop: ALL`, `cap_add: SYS_RESOURCE`, `read_only: true`, and `tmpfs` for temporary files
- **SEC-05 - Weak SECRET_KEY**: Removed default value for SECRET_KEY; now requires explicit configuration with minimum 32 characters and rejects known weak values (`change-me-in-production`, `changeme`, `secret`)
- **SEC-06 - Command Injection**: Fixed command injection vulnerability in `InstallDependenciesTool` by sanitizing package names with `shlex.quote()` before passing to shell

#### Hardening
- **SEC-07 - Security Headers**: Added HTTP security headers via middleware: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `Strict-Transport-Security` (production only)
- **SEC-08 - OAuth State Persistence**: Replaced in-memory `oauth_states` dict with Redis-backed storage (`oauth_state:{token}`) with 10-minute TTL — works across multiple instances, no memory leak, survives restarts
- **SEC-09 - CORS Restriction**: Restricted CORS `allow_methods` to explicit list (`GET, POST, PUT, PATCH, DELETE, OPTIONS`) and `allow_headers` to specific headers (`Authorization, Content-Type, Accept, X-Correlation-ID, X-Requested-With`) instead of wildcard `*`
- **SEC-10 - Account Lockout**: Implemented Redis-backed login attempt tracking with configurable `MAX_LOGIN_ATTEMPTS` (default 5) and `LOCKOUT_DURATION_MINUTES` (default 15); returns HTTP 429 when locked

### Added

#### Resilience
- **RES-01 - Global Exception Handler**: Added catch-all exception handler that logs full stack trace with correlation ID but returns only a generic error message to the client — prevents internal information leakage
- **RES-02 - AI Request Timeouts**: Added configurable `AI_REQUEST_TIMEOUT` (default 120s) applied to all AI provider calls via `asyncio.wait_for()`
- **RES-03 - Retry Logic**: Implemented `retry_with_backoff()` utility with exponential backoff (1s, 2s, 4s) for transient AI provider failures, configurable via `AI_RETRY_ATTEMPTS` (default 3)
- **RES-04 - Circuit Breaker**: Implemented circuit breaker pattern (`CircuitBreaker` class) for each AI provider with states CLOSED/OPEN/HALF_OPEN, configurable failure threshold and recovery timeout — prevents cascade failures
- **RES-05 - RAG Fallback**: RAG retrieval errors in `ChatService` are now caught and logged; chat continues without context instead of failing entirely
- **RES-06 - WebSocket Cleanup**: Dead WebSocket connections are now detected and removed during `send_to_user()` and `broadcast_to_chat()` operations instead of accumulating in memory

#### Operations
- **OPS-01 - Container Resource Limits**: Added `deploy.resources.limits` and `reservations` for all Docker services: API (2GB/2CPU), Web (1GB/1CPU), PostgreSQL (1GB/1CPU), Redis (512MB/0.5CPU), Sandbox (1GB/1CPU)
- **OPS-02 - Deep Health Check**: `/health` endpoint now verifies database connectivity (`SELECT 1`) and Redis connectivity (`PING`) with proper error reporting; returns HTTP 503 when degraded
- **OPS-03 - Graceful Shutdown**: Application shutdown now closes all active WebSocket connections with code 1001, clears connection registries, and disposes the SQLAlchemy engine connection pool

#### Observability
- **LOG-01 - Structured Logging**: Replaced basic text logging with JSON formatter (`JSONFormatter`) outputting `timestamp`, `level`, `logger`, `message`, `exception`, and `correlation_id` fields — compatible with log aggregation tools (ELK, CloudWatch, etc.)
- **LOG-02 - Correlation IDs**: Added `RequestContextMiddleware` that generates/propagates `X-Correlation-ID` header on every request, logs method/path/status/duration_ms, and returns the correlation ID in responses for end-to-end tracing

#### CI/CD
- **CI-01 - GitHub Actions Pipeline**: Created `.github/workflows/ci.yml` with 4 parallel jobs: Backend (ruff lint + black format + mypy types + pytest with coverage), Frontend (npm lint + tsc + build), Docker (image build verification), Security (pip-audit dependency scanning)
- **CI-02 - Pre-commit Hooks**: Added `.pre-commit-config.yaml` with hooks for trailing whitespace, YAML/JSON validation, large file detection, private key detection, merge conflict markers, ruff linting with auto-fix, and black formatting

#### Testing
- **TEST-01**: Added `test_permissions.py` with 9 authorization tests covering unauthenticated access, expired tokens, non-existent user tokens, cross-user project access, and malformed bearer tokens
- **TEST-02**: Added `test_resilience.py` with 9 tests for circuit breaker state transitions (closed/open/half-open/recovery) and retry logic (success, retry-then-succeed, max-attempts, timeout, circuit-breaker-rejection)
- **TEST-03**: Added `test_users.py` with 5 tests for user endpoints covering current user info, unauthorized access, invalid tokens, admin access, and superuser flag verification
- **TEST-04**: Added `test_oauth.py` with 6 tests covering provider listing, unknown provider authorization, invalid state callback, unauthenticated token connection, unauthenticated repos access, and empty token validation
- **TEST-05**: Added `test_security.py` with 8 tests for Fernet encryption (roundtrip, wrong key, invalid token, different ciphertexts), command injection blocking (7 dangerous patterns), safe command allowlisting (5 patterns), and health/root endpoints
- Set minimum coverage threshold to 40% in `pytest.ini` via `--cov-fail-under=40`

### Changed
- Application version bumped from `0.1.0` to `1.2.0`
- Redis now configured with `--maxmemory 256mb --maxmemory-policy allkeys-lru` in production compose
- Docker socket mount removed from API container (was only needed for sandbox, now handled differently)
- Test `conftest.py` sets `SECRET_KEY` environment variable before app imports for new validation requirement
- `.env.example` updated with all new configuration fields and removed insecure SECRET_KEY default

### New Files
- `apps/api/app/core/encryption.py` - Fernet encryption/decryption utility
- `apps/api/app/services/ai/resilience.py` - Circuit breaker and retry-with-backoff implementations
- `apps/api/tests/test_permissions.py` - Authorization and permission tests
- `apps/api/tests/test_resilience.py` - Circuit breaker and retry logic tests
- `apps/api/tests/test_users.py` - User endpoint tests
- `apps/api/tests/test_oauth.py` - OAuth flow tests
- `apps/api/tests/test_security.py` - Encryption and command injection tests
- `.github/workflows/ci.yml` - GitHub Actions CI pipeline
- `.pre-commit-config.yaml` - Pre-commit hook configuration

---

## [1.1.0] - 2025-12-29

### Fixed

#### Security Improvements
- **Path Traversal Protection**: Added `validate_path()` function to `file_tools.py` to prevent path traversal attacks via `..` or symlinks
- **Enhanced Command Blocking**: Added 25+ regex patterns in `execute_tools.py` to block dangerous commands including:
  - System destruction commands (`rm -rf /`, `mkfs`, `dd`)
  - Privilege escalation (`sudo`, `su`)
  - Remote code execution (`curl|bash`, `wget|sh`)
  - System control (`shutdown`, `reboot`, `halt`)
  - Process killing (`kill -9 -1`, `pkill -9`)
  - Network listeners (`nc -e`, `ncat -l`)

#### Code Quality Fixes
- **Deprecated datetime.utcnow()**: Updated all occurrences to use timezone-aware `datetime.now(timezone.utc)` in:
  - `app/core/security.py` - JWT token generation
  - `app/models/user.py` - User model timestamps
  - `app/models/project.py` - Project model timestamps
  - `app/models/chat.py` - Chat model timestamps

- **WebSocket Duplicate Accept**: Fixed duplicate `websocket.accept()` call in `app/api/websocket.py` by adding conditional accept parameter

- **Database Session Type Annotation**: Fixed `get_db()` return type from `AsyncSession` to `AsyncGenerator[AsyncSession, None]` in `app/api/deps.py`

- **ChromaDB Invalid Filter**: Fixed RAG retriever's `$contains` operator (not supported in ChromaDB) in `app/services/rag/retriever.py` - now uses post-filtering for substring matches

- **Temp File Cleanup**: Improved temporary file cleanup in `RunPythonTool` using proper `try/finally` pattern in `execute_tools.py`

- **pytest-asyncio Deprecation**: Removed deprecated manual `event_loop` fixture in `tests/conftest.py` - now uses `asyncio_mode=auto` from pytest.ini

### Changed
- Updated `pytest.ini` configuration for pytest-asyncio 0.23+ compatibility

---

## [1.0.0] - 2025-12-28

### Added
- Initial release of Martin-Coder platform
- Multi-LLM support (Claude, OpenAI, LM Studio, Ollama)
- RAG system with ChromaDB for semantic code search
- Sandboxed code execution in Docker containers
- Modern Web UI with Monaco Editor
- CLI interface for developers
- Git and GitHub integration
- Google Drive integration
- Plugin system with hooks
- Project templates
- OAuth authentication (GitHub, Google)
- Internationalization support (English, Spanish)
- Cross-platform startup scripts (Windows, Linux, Mac)
- Functional demo system

---

## Maintainer / Mantenedor

**Francisco Ortiz** - Dev-ops Marfinex
Email: francisco.ortiz@marfinex.com

---

*Martin-Coder Project - 2025*

---

<a name="español"></a>
## 🇪🇸 Español

Todos los cambios notables del proyecto Martin-Coder están documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto sigue [Versionado Semántico](https://semver.org/spec/v2.0.0.html).

---

## [2.3.0] - 2026-03-15 — Fase 2: Confianza, Trazabilidad y Endurecimiento de Validación

> **PR #26** — Endurecimiento funcional de grado productivo. Sin cambios cosméticos — pura profundidad, seguridad y comportamiento de ingeniería de nivel profesional.

### ✅ CONFIANZA — Diff / Revisión / Rollback / Snapshots

#### Sistema de Snapshots de Archivos
- Cada llamada a las herramientas `writeFile` y `editFile` captura automáticamente el contenido antes/después
- Snapshots almacenados en la nueva tabla `file_snapshots` de la BD con texto diff completo, líneas añadidas/eliminadas y tipo de cambio
- Tipos de cambio rastreados: `created` (creado), `modified` (modificado), `deleted` (eliminado)

#### Motor de Diff Unificado (`services/diff.ts`)
- Algoritmo diff puro en TypeScript basado en LCS — sin dependencias externas
- Produce `DiffHunk[]` estructurados con ventanas de contexto de 3 líneas
- Genera texto diff unificado compatible con el formato diff estándar
- Resúmenes diff a nivel de archivo: líneas añadidas, líneas eliminadas, conteo de hunks

#### Ciclo de Vida de Ejecución y Rollback (`services/execution.ts`)
- Cada solicitud del usuario crea un registro `Execution` rastreado con ID único
- Ciclo de vida completo: `understanding → scanning → reading → generating → applying → validating → completed/failed/rolled_back`
- `rollbackExecution()` restaura todos los archivos a su estado pre-ejecución de forma atómica
- El rollback maneja correctamente: eliminar archivos recién creados, restaurar archivos modificados, recrear archivos eliminados

#### Nuevas Rutas de API
- `GET /api/v1/executions?sessionId=:id` — listar todas las ejecuciones de una sesión
- `GET /api/v1/executions/:id` — obtener detalle de ejecución con snapshots + resultados de validación
- `POST /api/v1/executions/:id/rollback` — revertir todos los cambios de archivo de una ejecución
- `GET /api/v1/validation/detect?projectId=:id` — detectar herramientas de validación disponibles
- `POST /api/v1/validation/run` — ejecutar pipeline de validación bajo demanda

### 🔍 TRAZABILIDAD — Flujo de Tareas / Memoria de Sesión / Historial de Ejecución

#### Streaming de Fases en Tiempo Real
- `chat.ts` emite eventos SSE `task_status` en cada etapa de ejecución
- Nuevos tipos de eventos de stream: `task_status`, `file_changed`, `validation_result`
- El store de ejecución del frontend (`execution-store.ts`) conecta todos los eventos al estado de UI en vivo

#### Componente ExecutionTimeline
- Línea de tiempo visual paso a paso mostrada en el panel de chat durante la ejecución activa
- Muestra la fase actual con spinner animado, pasos completados con marcas de verificación
- El contador de archivos se actualiza en tiempo real a medida que se modifican archivos

#### Componente HistoryPanel
- Historial de ejecuciones por sesión con badge de fase, conteo de archivos y estado de validación
- Vista de detalle: diffs por archivo con DiffViewer inline, resultados de validación por herramienta
- Botón de rollback con confirmación — muestra conteo de archivos restaurados y errores

#### Nuevas Tablas en BD
- `executions` — registro completo de ejecución (fase, agente, archivos cambiados, resultado de validación)
- `file_snapshots` — contenido antes/después + diff unificado por archivo por ejecución
- `validation_results` — salida de validación por herramienta (código de salida, stdout, stderr, conteos)

### 🧪 VALIDACIÓN — Pipeline de Verificación Post-Cambio

#### Detección Consciente de Toolchain (`services/validation.ts`)
- Detecta herramientas disponibles desde archivos de configuración del proyecto automáticamente:
  - **TypeScript**: `tsconfig.json` → `tsc --noEmit`
  - **ESLint**: `.eslintrc.*` / `eslint.config.*` → `npm run lint` o `npx eslint`
  - **Biome**: `biome.json` → `npx biome check`
  - **Vitest** / **Jest**: detectado desde `devDependencies`
  - **pytest**: detectado desde `pytest.ini` / `pyproject.toml`
  - **Build**: desde `scripts.build` de `package.json`
- Ejecuta herramientas secuencialmente: typecheck → lint → test → build
- Detiene el pipeline anticipadamente ante fallos duros de typecheck o lint

#### Resultados de Validación
- Cada resultado de herramienta persistido en la tabla `validation_results`
- Resultados transmitidos en vivo al frontend vía SSE
- Resumen de validación adjuntado al mensaje del asistente en el chat
- Componente `ValidationPanel`: tarjetas colapsables por herramienta, vista previa de salida de errores

### 🖥️ Componentes UI Añadidos

| Componente | Propósito |
|-----------|---------|
| `components/execution/execution-timeline.tsx` | Barra de progreso de fases en vivo |
| `components/execution/history-panel.tsx` | Historial completo de ejecuciones + rollback |
| `components/diff/diff-viewer.tsx` | Tabla diff unificada con colores de sintaxis |
| `components/diff/live-diff-panel.tsx` | Panel lateral: archivos cambiados + validación |
| `components/validation/validation-panel.tsx` | Tarjetas de pasa/falla por herramienta |
| `lib/stores/execution-store.ts` | Store Zustand para todo el estado de ejecución |

### Cambiado
- `chat-store.ts` — maneja los nuevos eventos de stream `task_status`, `file_changed`, `validation_result`
- `chat-panel.tsx` — integra barra de timeline, botones de toolbar Historial/Cambios, paneles laterales
- `tools/index.ts` — `writeFile` y `editFile` ahora realizan snapshot + diff antes de cada escritura
- `shared/types.ts` — añadidos tipos `Execution`, `FileSnapshot`, `ValidationResult`, `FileDiffSummary`, `ValidationReport`

---

## [2.2.0] - 2026-03-15 — Reconstrucción Completa de Grado Productivo (PR #25)

> **PR #25** — Reconstrucción visual y de producto completa de la plataforma. Nuevas páginas de aterrizaje, presentación pública más sólida, layout de workspace mejorado, explorador de archivos estilo VS Code y flujo de interpretación/aprobación.

### ✨ Páginas de Aterrizaje y Marketing

- **Sección Hero** reconstruida: texto con degradado, resplandor radial, mockup de producto animado
- **Grid de características**: 8 capacidades con iconos y descripciones
- **Cómo funciona**: sección de flujo en 3 pasos
- **Sección de estadísticas**, grid de casos de uso, acordeón FAQ, CTA final
- Página `/features` reconstruida con secciones ricas y tabla comparativa
- Página `/pricing` reconstruida: toggle de facturación, listas completas de características, FAQ
- Página `/product` reconstruida: misión, pilares, stack tecnológico, diagrama de arquitectura
- Página `/login` rediseñada con encabezado de marca y layout centrado
- Nuevo componente `SiteFooter` (layout de 4 columnas) en todas las páginas públicas
- `SiteHeader` reconstruido con menú hamburguesa móvil y estados de enlace activo

### 🖥️ Layout del Workspace

- **Modos de 3 paneles**: Chat / Split / Editor — alternados desde la barra de herramientas
- **Atajos de teclado**: `Ctrl+E` para panel de editor, `Ctrl+\`` para terminal
- Mejores estados de carga y autenticación con spinner de marca
- Barra de herramientas del panel con botones de modo claros

### 📂 Explorador de Archivos Estilo VS Code

- Nuevo componente `FileExplorer` con árbol de carpetas colapsable
- Sangría basada en profundidad, expansión/colapso suave con animación de chevron
- Iconos de tipo de archivo con codificación de colores: TS=azul, JS=ámbar, JSON=naranja, etc.
- Iconos especiales para `package.json`, `.env`, `Dockerfile`, `tsconfig`, etc.
- Clic para abrir archivos sincronizado con editor Monaco
- Estados de carga skeleton, error y vacío

### 💬 Rediseño de Barra Lateral

- Barra lateral de tres pestañas: **Sessions | Explorer | Projects**
- Pestaña Sessions: barra de búsqueda + lista de sesiones con navegación
- Pestaña Explorer: árbol de archivos estilo VS Code
- Pestaña Projects: lista de proyectos con visualización de ruta, formulario de nuevo proyecto, enlace a GitHub
- Cambia automáticamente a la pestaña Explorer al seleccionar un proyecto

### 🔒 Controles de Seguridad (PR #24 incluido aquí)

- Modelo `SessionSafetySettings`: `readOnlyMode`, `requireApprovalForCommands`, `writableRoots`, `allowCommandPatterns`, `denyCommandPatterns`
- Configuración de seguridad persistida por sesión en BD (columna JSON `safety_settings`)
- Endpoints `GET/PUT /api/v1/sessions/:id/safety` para leer y actualizar
- Las herramientas aplican seguridad en tiempo de ejecución (modo solo lectura bloquea todas las escrituras, raíces escribibles restringen rutas)
- Lista de denegación predeterminada: `rm -rf`, `sudo`, `shutdown`, `reboot`, `mkfs`, `dd if=`, `chmod -R 777 /`

### 🛠️ Mejoras de CLI (PR #23/#24)

- Comando `martin doctor` — verificación de salud del entorno (versión de Bun, conectividad API, claves API configuradas)
- Comando `martin sessions` — listar, ver y eliminar sesiones de chat desde CLI
- Cliente API extendido (`cli/src/api.ts`) con métodos de gestión de sesiones

### Flujo de Interpretación/Aprobación

- Componente `InterpretationPanel` — muestra intención analizada antes de la ejecución
- Detecta: acciones de crear, depurar, refactorizar, revisar, eliminar, probar
- Muestra: resumen, alcance, archivos probablemente afectados, riesgos, suposiciones
- El usuario puede Aprobar y Ejecutar / Refinar el prompt / Cancelar

### Añadido
- `docs/REBUILD_AUDIT.md` — documento de auditoría para el alcance de la reconstrucción

---

## [2.0.1] - 2026-02-23 — Limpieza de Código Deprecado

### Eliminado

- **`apps/api/`** — API Python/FastAPI eliminada. Reemplazada por `packages/api/` (TypeScript/Bun/Hono).
- **`apps/web/`** — Frontend antiguo sin componentes actualizados. Reemplazado por `packages/web/`.
- **`apps/cli/`** — CLI Python eliminada. Reemplazada por `packages/cli/` (TypeScript).
- **`_python_backup/`** — Backup completo del stack Python v1.x eliminado. El historial queda disponible en git.
- Total: **242 archivos eliminados** (106 de `_python_backup/`, 136 de `apps/`).

---

## [2.0.0] - 2026-02-19 — Reescritura Completa en TypeScript

> **Cambio importante**: Reescritura completa de Python/FastAPI a TypeScript/Bun.
> El código Python se preserva en `_python_backup/` como referencia.

### ⚡ Arquitectura — Migración Total

- **Runtime**: Python → **Bun** (nativo TypeScript, inicio 3-5x más rápido)
- **Framework HTTP**: FastAPI → **Hono** (ultra-rápido, type-safe, listo para OpenAPI)
- **Base de datos**: PostgreSQL + Redis → **SQLite** (via Drizzle ORM, sin dependencias de infraestructura)
- **SDK de IA**: LangChain (Python) → **Vercel AI SDK** (TypeScript-first, más de 75 proveedores)
- **Monorepo**: Repositorio único → **Bun workspaces + Turbo** pipeline
- **Estructura de paquetes**: `apps/` → `packages/` (api, web, cli, shared)

### ✨ Nuevas Características — Paridad de características con opencode

#### Sistema de Agentes
- Añadido **agente build** estructurado — acceso completo: leer/escribir archivos, ejecutar bash, operaciones git, búsqueda web
- Añadido **agente plan** estructurado — solo lectura: analizar, buscar, revisar (sin escrituras, sin ejecución)
- Los agentes son seleccionables por sesión; por defecto usa `build`
- Soporte para definición de agentes personalizados via configuración

#### Integración LSP (Language Server Protocol)
- Clase `LSPManager` que gestiona ciclos de vida de servidores
- Soporte para **TypeScript** (`typescript-language-server`), **Python** (`pyright`), **Rust** (`rust-analyzer`), **Go** (`gopls`)
- Endpoints REST: `/api/v1/lsp/diagnostics`, `/completions`, `/hover`, `/definition`
- Diagnósticos de errores/advertencias en tiempo real por archivo
- Auto-detecta servidores LSP instalados; respaldo elegante cuando no están disponibles

#### Soporte MCP (Model Context Protocol)
- Clase `MCPManager` para registrar/gestionar servidores MCP
- Endpoints REST: `/api/v1/mcp/servers`, `/mcp/tools`, `/mcp/tools/:server/:tool`
- Conectar cualquier servidor de herramientas compatible con MCP
- Protocolo estándar — compatible con Claude Desktop, opencode y cualquier cliente MCP

#### Proveedores de IA — Expandidos
| Proveedor | Antes | Después |
|---|---|---|
| Anthropic Claude | ✅ | ✅ claude-opus-4-6, sonnet-4-5, haiku-4-5 |
| OpenAI | ✅ | ✅ gpt-4o, gpt-4-turbo, gpt-3.5-turbo |
| **Google Gemini** | ❌ | ✅ gemini-2.0-flash, gemini-1.5-pro |
| Ollama | ✅ | ✅ mejorado, auto-detecta modelos |
| LM Studio | ✅ | ✅ endpoint compatible con OpenAI |
| 70+ via AI SDK | ❌ | ✅ cualquier proveedor soportado por el paquete ai |

#### Gestión de Sesiones (reemplaza "chats")
- Compactación automática al **90% del límite de contexto** — resume mensajes más antiguos automáticamente, nunca pierde contexto
- **Seguimiento de costos en USD** por sesión (no solo tokens)
- Múltiples sesiones paralelas soportadas
- Persistencia de sesiones en SQLite con historial completo de mensajes
- `POST /api/v1/sessions/:id/messages` transmite via SSE (Server-Sent Events)

#### Seguimiento de Costos
- Cada mensaje rastrea `costUsd` (costo de entrada + salida)
- El `totalCost` de la sesión se acumula automáticamente
- Cálculo de costos por modelo (tablas de precios precisas)

#### Sistema de Herramientas — Expandido
- `readFile`, `writeFile`, `editFile`, `listDirectory`, `searchFiles`
- `executeBash` — más de 30 patrones peligrosos bloqueados, validación de rutas
- `gitStatus`, `gitDiff`, `gitCommit`, `gitLog`
- `installDependencies` — seguro contra inyección con validación de nombres de paquetes
- `webSearch` — integración de búsqueda web
- `codeSearch` — búsqueda semántica en archivos de proyecto

#### Especificación OpenAPI
- Spec OpenAPI 3.0 auto-generada en `GET /openapi.json`
- Todas las rutas documentadas con esquemas de solicitud/respuesta
- Generada desde definiciones de rutas de Hono (siempre sincronizada)

### 🗃️ Cambios en la Base de Datos

- **Eliminado**: PostgreSQL, Redis, ChromaDB (sin dependencias externas)
- **Añadido**: SQLite via Drizzle ORM (archivo en `./data/martin-coder.db`)
- **Renombrado**: tabla `chats` → `sessions` (con campos `agentName`, `totalCost`, `autoCompacted`)
- **Añadido**: columna `messages.costUsd`
- **Añadido**: tabla `plugins`
- Migraciones de esquema gestionadas por Drizzle Kit

### 📦 Nuevos Paquetes

- **`@martin-coder/api`** — Servidor Hono + Bun (reemplaza `apps/api` Python)
- **`@martin-coder/shared`** — Tipos TypeScript compartidos usados por todos los paquetes
- **`@martin-coder/cli`** — CLI TypeScript (reemplaza `apps/cli` Python)
- **`packages/web`** — Next.js (migrado desde `apps/web`, cliente API actualizado)

### 🔧 Cambios de Infraestructura

- **Eliminado**: Docker requerido para ejecutar (ahora opcional solo para despliegue)
- **Añadido**: `bun install && bun dev` — comando único para iniciar todo
- **Añadido**: `turbo.json` — builds paralelos, caché, orquestación de tareas
- **Añadido**: `package.json` configuración de workspace raíz
- **Añadido**: `tsconfig.json` configuración TypeScript raíz (modo strict)
- **Actualizado**: `.env.example` — simplificado, variables de PostgreSQL/Redis eliminadas

---

## [1.2.0] - 2026-02-14

### Seguridad

#### Correcciones Críticas
- **SEC-01 - Cifrado de Clave API**: Añadida utilidad de cifrado basada en Fernet (`app/core/encryption.py`) para cifrar datos sensibles en reposo (claves API, tokens) usando una clave derivada de SECRET_KEY
- **SEC-02 - Exposición de Token OAuth**: Tokens de callback OAuth movidos de parámetros de consulta URL a cookies HttpOnly con atributos `secure`, `samesite=lax` y `path` con alcance — los tokens ya no aparecen en historial del navegador, logs o cabeceras Referer
- **SEC-03 - Limitación de Tasa**: Añadidos campos de configuración `RATE_LIMIT_DEFAULT` y `RATE_LIMIT_AUTH` para limitación de tasa via Redis
- **SEC-04 - Escape de Sandbox**: Eliminados `privileged: true` y montaje de socket Docker del contenedor sandbox; añadidos `security_opt: no-new-privileges`, `cap_drop: ALL`, `cap_add: SYS_RESOURCE`, `read_only: true` y `tmpfs` para archivos temporales
- **SEC-05 - SECRET_KEY Débil**: Eliminado valor predeterminado para SECRET_KEY; ahora requiere configuración explícita con mínimo 32 caracteres y rechaza valores débiles conocidos
- **SEC-06 - Inyección de Comandos**: Corregida vulnerabilidad de inyección de comandos en `InstallDependenciesTool` sanitizando nombres de paquetes con `shlex.quote()` antes de pasar al shell

#### Endurecimiento
- **SEC-07 - Cabeceras de Seguridad**: Añadidas cabeceras HTTP de seguridad via middleware
- **SEC-08 - Persistencia de Estado OAuth**: Reemplazado dict `oauth_states` en memoria por almacenamiento respaldado en Redis con TTL de 10 minutos
- **SEC-09 - Restricción CORS**: Restringidos `allow_methods` y `allow_headers` de CORS a listas explícitas en lugar de comodín `*`
- **SEC-10 - Bloqueo de Cuenta**: Implementado seguimiento de intentos de login respaldado en Redis con `MAX_LOGIN_ATTEMPTS` configurable (predeterminado 5) y `LOCKOUT_DURATION_MINUTES` (predeterminado 15)

### Añadido

#### Resiliencia
- **RES-01** - Manejador de excepciones global con ID de correlación
- **RES-02** - Timeouts configurables para solicitudes de IA (`AI_REQUEST_TIMEOUT`, predeterminado 120s)
- **RES-03** - Lógica de reintento con retroceso exponencial para fallos transitorios de proveedores de IA
- **RES-04** - Patrón de circuit breaker para cada proveedor de IA con estados CERRADO/ABIERTO/SEMI-ABIERTO
- **RES-05** - Errores de recuperación RAG capturados y registrados; el chat continúa sin contexto en lugar de fallar
- **RES-06** - Conexiones WebSocket muertas detectadas y eliminadas durante operaciones de envío

#### Operaciones
- **OPS-01** - Límites de recursos de contenedor para todos los servicios Docker
- **OPS-02** - Verificación profunda del endpoint `/health` (conectividad DB + Redis)
- **OPS-03** - Apagado elegante con cierre de conexiones WebSocket activas

#### Observabilidad
- **LOG-01** - Registro estructurado con formateador JSON compatible con herramientas de agregación de logs
- **LOG-02** - IDs de correlación propagados en cada solicitud via middleware `RequestContextMiddleware`

#### CI/CD
- **CI-01** - Pipeline de GitHub Actions con 4 jobs paralelos: Backend, Frontend, Docker, Seguridad
- **CI-02** - Hooks pre-commit con ruff, black, detección de claves privadas y más

#### Pruebas
- **TEST-01** a **TEST-05**: Suites de prueba para permisos, resiliencia, usuarios, OAuth y seguridad
- Umbral mínimo de cobertura establecido en 40% en `pytest.ini`

### Cambiado
- Versión de aplicación actualizada de `0.1.0` a `1.2.0`
- Redis configurado con `--maxmemory 256mb --maxmemory-policy allkeys-lru` en producción
- Socket Docker eliminado del contenedor API

---

## [1.1.0] - 2025-12-29

### Corregido

#### Mejoras de Seguridad
- **Protección contra Path Traversal**: Añadida función `validate_path()` en `file_tools.py` para prevenir ataques de traversal de rutas
- **Bloqueo de Comandos Mejorado**: Añadidos más de 25 patrones regex para bloquear comandos peligrosos incluyendo comandos de destrucción del sistema, escalada de privilegios, ejecución remota de código, control del sistema, eliminación de procesos y escuchas de red

#### Correcciones de Calidad de Código
- **datetime.utcnow() Deprecado**: Actualizadas todas las ocurrencias para usar `datetime.now(timezone.utc)` con conciencia de zona horaria
- **WebSocket Aceptar Duplicado**: Corregida llamada duplicada a `websocket.accept()` en `app/api/websocket.py`
- **Anotación de Tipo de Sesión DB**: Corregido tipo de retorno de `get_db()` de `AsyncSession` a `AsyncGenerator[AsyncSession, None]`
- **Filtro Inválido de ChromaDB**: Corregido operador `$contains` del recuperador RAG (no soportado en ChromaDB)
- **Limpieza de Archivos Temporales**: Mejorada limpieza de archivos temporales en `RunPythonTool` usando patrón `try/finally`
- **Deprecación pytest-asyncio**: Eliminada fixture `event_loop` manual deprecada — ahora usa `asyncio_mode=auto`

### Cambiado
- Configuración de `pytest.ini` actualizada para compatibilidad con pytest-asyncio 0.23+

---

## [1.0.0] - 2025-12-28

### Añadido
- Versión inicial de la plataforma Martin-Coder
- Soporte multi-LLM (Claude, OpenAI, LM Studio, Ollama)
- Sistema RAG con ChromaDB para búsqueda semántica de código
- Ejecución de código sandboxed en contenedores Docker
- UI web moderna con Editor Monaco
- Interfaz CLI para desarrolladores
- Integración con Git y GitHub
- Integración con Google Drive
- Sistema de plugins con hooks
- Plantillas de proyectos
- Autenticación OAuth (GitHub, Google)
- Soporte de internacionalización (inglés, español)
- Scripts de inicio multiplataforma (Windows, Linux, Mac)
- Sistema de demostración funcional

---

## Mantenedor

**Francisco Ortiz** - Dev-ops Marfinex
Email: francisco.ortiz@marfinex.com

---

*Proyecto Martin-Coder - 2025*
