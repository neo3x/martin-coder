# Changelog

All notable changes to the Martin-Coder project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
