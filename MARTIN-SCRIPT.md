# Script de Gestión — Martin-Coder v2.0

Guía completa para `martin.sh` (Linux/macOS) y `martin.bat` (Windows).

## Descripción

El script de gestión es una interfaz unificada para todas las operaciones de Martin-Coder. Soporta tanto un **menú interactivo** (sin argumentos) como **comandos directos** para automatización y CI/CD.

Características:
- Detección automática de `docker compose` o `docker-compose`
- Smart rebuild — detecta cambios en `packages/api`, `packages/web`, `packages/shared`
- Modo dev local con Bun (sin Docker)
- Health checks para API y Web UI
- Salida con código de color
- Confirmaciones para operaciones destructivas
- Compatible en Windows (`martin.bat`) y Linux/macOS (`martin.sh`)

---

## Quick Start

```bash
# Linux/macOS — hacer ejecutable (solo la primera vez)
chmod +x martin.sh

# Menú interactivo
./martin.sh           # Linux/macOS
martin.bat            # Windows

# Comando directo
./martin.sh start
martin.bat start
```

---

## Menú Interactivo

Al ejecutar sin argumentos se muestra el menú:

```
Martin-Coder v2.0

Choose an action:

   1) Start services (smart up)
   2) Stop services
   3) Restart services (smart-aware)
   4) Status & health
   5) Logs
   6) Build all containers
   7) Sync (rebuild what changed)
   8) Dev mode (local Bun, no Docker)
   9) Run tests
  10) Run lint
  11) Database management
  12) Update (pull & rebuild)
  13) Project info
  14) Shell access
  15) Clean all data
  16) Help
   0) Exit

Select (0-16):
```

---

## Comandos Docker

### `start`
Inicia los servicios con detección inteligente de cambios.

```bash
./martin.sh start
martin.bat start
```

**Pasos:**
1. Verifica que Docker y Docker Compose estén instalados
2. Verifica que Bun esté instalado
3. Crea `.env` desde `.env.example` si no existe
4. Instala dependencias con `bun install`
5. Detecta si hay cambios en `packages/api`, `packages/web` o `packages/shared`
6. Construye solo los servicios que cambiaron (smart rebuild)
7. Inicia los servicios en segundo plano
8. Ejecuta health checks

---

### `stop`
Detiene los servicios con opción de preservar o borrar datos.

```bash
./martin.sh stop
```

**Opciones:**
1. Detener servicios (conservar datos) — `docker compose down`
2. Detener y eliminar todo (contenedores + volúmenes + datos) — `docker compose down -v`
3. Cancelar

---

### `restart`
Reinicia los servicios. Si se detectan cambios, hace rebuild antes.

```bash
./martin.sh restart
```

---

### `status`
Muestra el estado detallado de los servicios.

```bash
./martin.sh status
```

**Muestra:**
- Estado de los contenedores (`docker compose ps`)
- URLs de acceso
- Health checks (API: `GET /health`, Web: HTTP check)
- Uso de recursos (CPU y memoria)
- Menú de acciones rápidas: `[l]` logs · `[r]` restart · `[s]` stop · `[q]` salir

---

### `logs`
Muestra los logs de los servicios.

```bash
./martin.sh logs           # Todos los servicios
./martin.sh logs api       # Solo el API
./martin.sh logs web       # Solo el frontend
```

Presionar `Ctrl+C` para salir.

---

### `build`
Fuerza el rebuild completo de todos los contenedores.

```bash
./martin.sh build
```

Usar después de cambios en Dockerfiles o cuando se quiere asegurar una imagen limpia.

---

### `sync`
Rebuild inteligente — solo reconstruye los servicios que tuvieron cambios.

```bash
./martin.sh sync
```

Compara fechas de modificación de `packages/api`, `packages/web`, `packages/shared` y reconstruye solo lo necesario.

---

### `clean`
Elimina contenedores, volúmenes, redes y artefactos de build.

```bash
./martin.sh clean
```

**Advertencia:** Elimina TODOS los datos incluyendo la base de datos SQLite. Requiere confirmación escribiendo `yes`.

---

### `shell`
Abre un shell dentro del contenedor indicado.

```bash
./martin.sh shell api      # bash en contenedor API (Bun/Hono)
./martin.sh shell web      # sh en contenedor Web (Next.js)
```

---

## Comandos de Desarrollo

### `dev`
Inicia el modo desarrollo local con Bun (sin Docker).

```bash
./martin.sh dev            # API + Web en paralelo (turbo dev)
./martin.sh dev api        # Solo el API en http://localhost:8000
./martin.sh dev web        # Solo el frontend en http://localhost:3005
./martin.sh dev cli        # CLI en modo watch
```

---

### `test`
Ejecuta el suite de tests via Turbo.

```bash
./martin.sh test           # Todos los packages
./martin.sh test api       # Solo packages/api
./martin.sh test web       # Solo packages/web
```

---

### `lint`
Ejecuta el linter via Turbo.

```bash
./martin.sh lint           # Todos los packages
./martin.sh lint api       # Solo packages/api
./martin.sh lint web       # Solo packages/web
```

---

### `db`
Gestión de la base de datos SQLite via Drizzle ORM.

```bash
./martin.sh db migrate     # Aplicar schema (drizzle-kit push)
./martin.sh db generate    # Generar archivos SQL de migración
./martin.sh db studio      # Abrir Drizzle Studio en http://localhost:4983
./martin.sh db reset       # Borrar y recrear la base de datos
```

---

### `update`
Actualiza el proyecto: git pull + instala deps + rebuild Docker.

```bash
./martin.sh update
```

**Pasos:**
1. Verifica que Git esté instalado
2. `git pull` — obtiene los últimos cambios
3. `bun install` — actualiza dependencias
4. Rebuild de contenedores Docker si está disponible
5. Opción de reiniciar servicios inmediatamente

---

### `info`
Muestra información del stack y del proyecto.

```bash
./martin.sh info
```

**Muestra:** Runtime, Language, API framework, Frontend, Database, AI SDKs, Build tool, packages del monorepo, features habilitadas.

---

### `help`
Muestra la ayuda con todos los comandos disponibles.

```bash
./martin.sh help
./martin.sh --help
./martin.sh -h
```

---

## Referencia rápida

```bash
# ── Docker ──────────────────────────────────────────────────
./martin.sh start          # Iniciar con smart rebuild
./martin.sh stop           # Detener (con opciones de datos)
./martin.sh restart        # Reiniciar (smart-aware)
./martin.sh status         # Estado + health + menú rápido
./martin.sh logs [svc]     # Ver logs (api | web)
./martin.sh build          # Rebuild forzado de todo
./martin.sh sync           # Rebuild solo lo que cambió
./martin.sh clean          # Eliminar todo (con confirmación)
./martin.sh shell api      # Shell en contenedor API
./martin.sh shell web      # Shell en contenedor Web

# ── Desarrollo ──────────────────────────────────────────────
./martin.sh dev            # Dev local completo (Bun, sin Docker)
./martin.sh dev api        # Solo API en modo dev
./martin.sh dev web        # Solo Web en modo dev
./martin.sh test [pkg]     # Tests via Turbo
./martin.sh lint [pkg]     # Linter via Turbo
./martin.sh db migrate     # Aplicar schema SQLite
./martin.sh db generate    # Generar SQL de migración
./martin.sh db studio      # Drizzle Studio
./martin.sh db reset       # Resetear BD
./martin.sh update         # git pull + bun install + rebuild
./martin.sh info           # Info del proyecto
./martin.sh help           # Mostrar ayuda
```

---

## Ejemplos de uso

### Primer setup

```bash
git clone https://github.com/neo3x/martin-coder.git
cd martin-coder
./martin.sh start          # Crea .env, instala deps, build, inicia
```

### Desarrollo diario

```bash
./martin.sh dev            # Sin Docker, hot reload
# ... hacer cambios en código ...
./martin.sh test           # Verificar que los tests pasen
./martin.sh lint           # Verificar linting
```

### Despliegue con Docker

```bash
./martin.sh start          # Build y arranque con smart rebuild
./martin.sh status         # Verificar salud
./martin.sh logs api       # Ver logs del API
```

### Después de un `git pull`

```bash
./martin.sh update         # Pull + deps + rebuild automático
# o
git pull
./martin.sh sync           # Solo reconstruye lo que cambió
```

### Debug de un problema

```bash
./martin.sh status         # Ver estado y health checks
./martin.sh logs           # Ver todos los logs
./martin.sh shell api      # Entrar al contenedor a investigar
./martin.sh db studio      # Inspeccionar la base de datos
```

### Reset completo

```bash
./martin.sh clean          # Eliminar todo
./martin.sh start          # Arrancar desde cero
```

---

## Estructura del script

```
martin.sh / martin.bat
├── Definición de colores y helpers
│   ├── print_info / print_success / print_warning / print_error
│   ├── command_exists (verificación de dependencias)
│   └── detect_docker_compose (detección de docker compose v1/v2)
├── Smart rebuild
│   ├── check_rebuild_needed (compara timestamps de packages/)
│   ├── reset_rebuild_flags
│   └── print_rebuild_plan
├── Comandos Docker
│   ├── start_services (smart up con rebuild si es necesario)
│   ├── stop_services (interactivo)
│   ├── restart_services
│   ├── show_status (health checks + menú rápido)
│   ├── view_logs
│   ├── build_containers (force rebuild)
│   ├── sync_services (smart rebuild)
│   ├── clean_all
│   └── access_shell (api | web)
├── Comandos de desarrollo
│   ├── dev_mode (Bun dev, sin Docker)
│   ├── run_tests (turbo run test)
│   ├── run_lint (turbo run lint)
│   ├── db_manage (migrate | generate | studio | reset)
│   ├── update_project (git pull + bun install + rebuild)
│   └── show_info
├── show_help
└── main (dispatcher: menú interactivo | comando directo)
```

---

## Requisitos

| Requisito | Versión mínima | Notas |
|-----------|---------------|-------|
| Bash | 4.0+ | Linux/macOS |
| Docker | 24+ | Para comandos Docker |
| Docker Compose | v2 (plugin) o v1 (`docker-compose`) | Auto-detectado |
| Bun | 1.1+ | Para comandos de desarrollo |
| Git | 2.40+ | Para el comando `update` |

> En Windows, `martin.bat` requiere `cmd.exe` con soporte de `setlocal EnableDelayedExpansion` (disponible desde Windows XP).

---

## Códigos de salida

| Código | Significado |
|--------|-------------|
| `0` | Éxito |
| `1` | Error (con mensaje descriptivo) |

---

## URLs de acceso

| Servicio | URL |
|---------|-----|
| Web UI | http://localhost:3005 |
| API | http://localhost:8000 |
| API Health | http://localhost:8000/health |
| OpenAPI Spec | http://localhost:8000/openapi.json |
| Drizzle Studio | http://localhost:4983 (solo con `db studio`) |

---

*Martin-Coder v2.0 — Script Guide — 2026*
