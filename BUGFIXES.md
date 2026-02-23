# Bug Fixes - Martin-Coder

## v2.0 — TypeScript / Bun Stack (2026-02-19 →)

> El proyecto fue completamente reescrito como v2.0 el 2026-02-19.
> Stack migrado: **Python / FastAPI / PostgreSQL / Redis → TypeScript / Bun / Hono / SQLite**.
> Todos los fixes del stack Python v1.x se archivaron en `_python_backup/` (eliminado en v2.0.1 — historial disponible en git).

---

### 2026-02-23

#### 6. Eliminación de carpetas deprecadas `apps/` y `_python_backup/`

**Problema:** Las carpetas `apps/` (API Python, web antiguo, CLI Python) y `_python_backup/` (backup del código Python) seguían presentes en el repositorio pese a que el stack activo es 100% TypeScript/Bun en `packages/`. Generaban confusión y añadían 242 archivos innecesarios al árbol del proyecto.

**Solución:** Eliminación completa de ambas carpetas.

| Carpeta eliminada | Contenido | Reemplazado por |
|-------------------|-----------|-----------------|
| `apps/api/` | FastAPI + Alembic + tests Python | `packages/api/` (Hono/Bun) |
| `apps/web/` | Next.js sin componentes nuevos | `packages/web/` |
| `apps/cli/` | CLI Python | `packages/cli/` (TypeScript) |
| `_python_backup/` | Backup completo del stack v1.x | Historial git |

**Archivos eliminados:** 242 (106 de `_python_backup/`, 136 de `apps/`)

---

### 2026-02-20

#### 1. martin.bat — `|| exit /b 1` faltante en `:update_project` (línea 770)

**Problema:** `call :detect_docker_compose` en la sección `:update_project` no tenía guard de error, mientras que todas las demás llamadas a `detect_docker_compose` en el archivo usan `|| exit /b 1`.

**Solución:** Se agregó `|| exit /b 1` para asegurar propagación consistente de errores cuando falla la detección de Docker Compose.

**Archivos Modificados:**
- `martin.bat` (línea 770)

---

### 2026-02-19 — Fixes de lanzamiento v2.0

#### 2. martin.bat — expansión de variables en `smart_up` y `update_project`

**Problema:** Varias secciones usaban `%DOCKER_COMPOSE%` (expansión estándar) dentro de bloques `setlocal EnableDelayedExpansion` donde se requiere `!DOCKER_COMPOSE!` (expansión diferida). Esto causaba que la variable se resolviera vacía.

**Solución:** Se reemplazaron todas las referencias `%DOCKER_COMPOSE%` y `%errorlevel%` dentro de bloques de expansión diferida con `!DOCKER_COMPOSE!` y `!errorlevel!`.

**Archivos Modificados:**
- `martin.bat` (secciones smart_up, update_project)

---

#### 3. martin.bat — comandos nuevos faltantes (dev, test, lint, db, update, info, sync)

**Problema:** El `martin.bat` original solo tenía comandos orientados a Docker (`start`, `stop`, `restart`, `status`, `logs`, `build`, `clean`, `shell`). El stack TypeScript/Bun v2.0 requiere comandos adicionales de flujo de desarrollo.

**Solución:** Se agregó el set completo de comandos equivalente a `martin.sh`:
- `dev [api|web|cli]` — modo dev con Bun sin Docker
- `test [package]` — ejecutar tests vía Turbo
- `lint [package]` — ejecutar linter vía Turbo
- `db <migrate|generate|studio|reset>` — operaciones de base de datos con Drizzle ORM
- `update` — git pull + bun install + rebuild Docker
- `info` — mostrar info del stack y del proyecto
- `sync` — rebuild inteligente solo de servicios modificados

**Archivos Modificados:**
- `martin.bat`

---

#### 4. martin.sh — reescritura completa para TypeScript/Bun v2.0

**Problema:** `martin.sh` estaba escrito para el stack Python/FastAPI con rutas apuntando a `apps/api`, `apps/web`, PostgreSQL, Redis, etc.

**Solución:** Se reescribió `martin.sh` para que tenga paridad completa con `martin.bat`:
- Rutas actualizadas de `apps/` a `packages/`
- Verificaciones de Python/pip reemplazadas por verificaciones de Bun
- Detección de rebuild inteligente para `packages/api`, `packages/web`, `packages/shared`
- Todos los comandos nuevos agregados (dev, test, lint, db, update, info, sync)
- Menú interactivo de 16 opciones (antes 9)
- Se eliminó acceso shell a PostgreSQL/Redis; se agregó flujo de desarrollo nativo con Bun

**Archivos Modificados:**
- `martin.sh`

---

#### 5. packages/web/next.config.js — comentario obsoleto referenciando FastAPI

**Problema:** El comentario en `next.config.js` decía `"Proxy to FastAPI backend"` aunque el backend ahora es Hono (TypeScript/Bun).

**Solución:** Comentario actualizado a `"Proxy to Hono API backend"`.

**Archivos Modificados:**
- `packages/web/next.config.js`

---

## v1.x — Stack Python (archivado)

Todos los fixes v1.x (54 items) están archivados a continuación en forma resumida. El código al que aplicaban vivía en `_python_backup/` (eliminado en v2.0.1 — ver historial git).

| Período | Categoría | Cant. | Resumen |
|---------|-----------|-------|---------|
| 2026-01-11 | Docker build, TypeScript, deps Python | 16 | Fallos de build Docker, módulos TS/stores faltantes, conflictos de dependencias npm/pip |
| 2026-01-12 | Runtime API, integración frontend | 4 | Compat NumPy/ChromaDB, singleton template_manager, timezone DateTime, proxy API |
| 2026-02-11 | Estabilidad frontend, compatibilidad PR | 8 | Archivos lib faltantes, build offline (Google Font), ESLint, i18n, assets binarios |
| 2026-02-14 | Production readiness (seguridad, resiliencia, ops) | 26 | SEC-01→10, RES-01→06, OPS-01→03, LOG-01→02, CI-01→02, TEST-01→05 |

---

_Última actualización: 2026-02-23_
_Proyecto: Martin-Coder v2.0_
