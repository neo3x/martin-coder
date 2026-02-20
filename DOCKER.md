# Docker Setup Guide - Martin-Coder v2.0

> Stack: **Hono + Bun** (API) · **Next.js 14** (Web) · **SQLite** (DB)
> Sin PostgreSQL. Sin Redis. Sin sandbox. Solo dos contenedores.

---

## Quick Start

### Opción 1: Script de gestión (Recomendado)

```bash
# Menú interactivo
./martin.sh           # Linux/macOS
martin.bat            # Windows

# O comandos directos
./martin.sh start     # Iniciar con smart rebuild
./martin.sh stop      # Detener servicios
./martin.sh status    # Estado y salud
```

### Opción 2: Docker Compose directo

```bash
# Copiar configuración
cp .env.example .env
# Editar .env — mínimo: SECRET_KEY y al menos una API key de IA

# Construir e iniciar
docker compose build
docker compose up -d

# Verificar
docker compose ps
curl http://localhost:8000/health
```

---

## Servicios

Martin-Coder v2.0 ejecuta solo **2 servicios Docker**:

| Servicio | Puerto | Imagen | Descripción |
|----------|--------|--------|-------------|
| **api** | 8000 | `martin-coder-api:2.0` | Hono REST API (Bun) |
| **web** | 3000 | `martin-coder-web:2.0` | Next.js 14 frontend |

> La base de datos SQLite se persiste en el volumen Docker `db_data` (montado en `/data/martin-coder.db` dentro del contenedor `api`).

---

## Comandos del Script de Gestión

```bash
# ── Docker ──────────────────────────────────────────────────
./martin.sh start          # Iniciar con detección de cambios automática
./martin.sh stop           # Detener (opción: conservar o borrar datos)
./martin.sh restart        # Reiniciar servicios
./martin.sh status         # Estado + health checks + menú rápido
./martin.sh logs [servicio] # Ver logs (api | web)
./martin.sh build          # Rebuild forzado de todos los contenedores
./martin.sh sync           # Rebuild inteligente (solo lo que cambió)
./martin.sh clean          # Eliminar contenedores, volúmenes y redes

# ── Acceso a contenedores ────────────────────────────────────
./martin.sh shell api      # Shell en contenedor API (bash)
./martin.sh shell web      # Shell en contenedor Web (sh)

# ── Desarrollo ──────────────────────────────────────────────
./martin.sh dev            # Modo dev local con Bun (sin Docker)
./martin.sh dev api        # Solo el API en modo dev
./martin.sh dev web        # Solo el frontend en modo dev
./martin.sh test           # Ejecutar tests vía Turbo
./martin.sh lint           # Ejecutar linter vía Turbo
./martin.sh db migrate     # Aplicar schema SQLite (drizzle push)
./martin.sh db generate    # Generar SQL de migraciones
./martin.sh db studio      # Abrir Drizzle Studio (explorador de BD)
./martin.sh db reset       # Borrar y recrear la base de datos
./martin.sh update         # git pull + bun install + rebuild
./martin.sh info           # Info del stack y del proyecto
```

---

## Docker Compose directo

### Iniciar y detener

```bash
# Iniciar en segundo plano
docker compose up -d

# Ver logs en tiempo real
docker compose up

# Detener (conserva datos)
docker compose down

# Detener y eliminar datos
docker compose down -v
```

### Build y rebuild

```bash
# Build de todos los contenedores
docker compose build

# Build de un servicio específico
docker compose build api
docker compose build web

# Rebuild sin caché
docker compose build --no-cache

# Rebuild y reiniciar en un comando
docker compose up -d --build
```

### Logs y monitoreo

```bash
# Ver todos los logs
docker compose logs

# Seguir logs en tiempo real
docker compose logs -f

# Logs de un servicio
docker compose logs -f api
docker compose logs -f web

# Últimas 100 líneas
docker compose logs --tail=100 api
```

### Gestión de servicios

```bash
# Estado de los contenedores
docker compose ps

# Reiniciar todos
docker compose restart

# Reiniciar un servicio
docker compose restart api

# Detener/iniciar servicio individual
docker compose stop web
docker compose start web
```

### Acceso a contenedores

```bash
# Shell en el contenedor API
docker compose exec api bash

# Shell en el contenedor Web
docker compose exec web sh
```

---

## Troubleshooting

### Puerto en uso

```bash
# Verificar qué usa el puerto
lsof -i :3000   # web
lsof -i :8000   # api

# Matar el proceso
kill -9 <PID>

# O cambiar el puerto en .env
PORT=8001
```

### El contenedor no arranca

```bash
# Ver logs del contenedor
docker compose logs api
docker compose logs web

# Reiniciar desde cero
docker compose down -v
docker compose up -d
```

### Errores de build

```bash
# Limpiar caché de build
docker builder prune

# Build sin caché
docker compose build --no-cache

# Verificar versión de Docker
docker --version
docker compose version
```

### API no responde

```bash
# Verificar health
curl http://localhost:8000/health

# Ver logs
./martin.sh logs api

# Verificar .env (SECRET_KEY es obligatorio)
grep SECRET_KEY .env
```

### Base de datos corrupta o errores de schema

```bash
# Resetear la base de datos (borra todos los datos)
./martin.sh db reset

# O manualmente dentro del contenedor
docker compose exec api sh -c "rm -f /data/martin-coder.db"
docker compose restart api
```

### Sin espacio en disco

```bash
# Limpiar recursos Docker no usados
docker system prune

# Eliminar imágenes, contenedores y volúmenes no usados
docker system prune -a -f

# Ver uso de disco
docker system df
```

### No puede conectar al daemon Docker

```bash
# macOS — iniciar Docker Desktop
open -a Docker

# Linux — iniciar servicio
sudo systemctl start docker

# Linux — agregar usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker
```

---

## Variables de entorno

### Variables requeridas

```env
# Obligatorio: clave para JWT (mínimo 32 caracteres)
SECRET_KEY=tu-clave-secreta-fuerte-de-al-menos-32-chars

# Obligatorio: al menos un proveedor de IA
ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# GOOGLE_GENERATIVE_AI_API_KEY=AIza...
```

### Variables opcionales

```env
PORT=8000                         # Puerto del API (default: 8000)
NODE_ENV=production               # Entorno
DATABASE_PATH=/data/martin-coder.db  # Ruta de la base de datos SQLite
FRONTEND_URL=http://localhost:3000   # URL del frontend (para CORS)
CORS_ORIGINS=http://localhost:3000   # Orígenes CORS permitidos
OLLAMA_BASE_URL=http://localhost:11434  # URL de Ollama (modelos locales)
LMSTUDIO_BASE_URL=http://localhost:1234/v1  # URL de LM Studio
DEFAULT_AI_PROVIDER=anthropic     # Proveedor IA por defecto
FIRST_ADMIN_EMAIL=admin@example.com  # Email del admin inicial
FIRST_ADMIN_PASSWORD=changeme     # Contraseña del admin inicial
LOG_LEVEL=info                    # Nivel de logs
```

### Generar SECRET_KEY

```bash
# Con OpenSSL
openssl rand -hex 32

# Con Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Con Bun
bun -e "console.log(Bun.randomUUIDv7())"
```

---

## Persistencia de datos

Los datos se persisten en volúmenes Docker:

| Volumen | Descripción |
|---------|-------------|
| `db_data` | Base de datos SQLite (`/data/martin-coder.db` en el contenedor API) |

### Backup de la base de datos

```bash
# Copiar el archivo SQLite del volumen al host
docker compose exec api cat /data/martin-coder.db > backup-$(date +%Y%m%d).db

# O usando docker cp
docker compose cp api:/data/martin-coder.db ./backup-$(date +%Y%m%d).db
```

### Restaurar la base de datos

```bash
# Detener el API
docker compose stop api

# Restaurar desde backup
docker compose cp ./backup-YYYYMMDD.db api:/data/martin-coder.db

# Reiniciar
docker compose start api
```

---

## Desarrollo vs Producción

### Modo producción (docker-compose.yml)

```bash
docker compose up -d
```

- Imágenes optimizadas multi-stage (Bun build)
- `NODE_ENV=production`
- Health checks activos
- Límites de recursos (API: 2GB/2CPU, Web: 1GB/1CPU)

### Modo desarrollo (docker-compose.dev.yml)

```bash
docker compose -f docker-compose.dev.yml up
```

- Hot reload con Bun `--watch` (API)
- Hot reload con Next.js dev server (Web)
- Código fuente montado como volumen

### Desarrollo local sin Docker

```bash
# Instalar dependencias
bun install

# Dev completo (API + Web en paralelo)
bun run dev

# O por servicio
./martin.sh dev api    # API en http://localhost:8000
./martin.sh dev web    # Web en http://localhost:3000
```

---

## Networking

Los servicios corren en la red `martin-network`:

- `web` → `api`: `http://api:8000` (interno)
- Host → `api`: `http://localhost:8000`
- Host → `web`: `http://localhost:3000`

### Proxy inverso (Nginx) — Producción

```nginx
server {
    listen 443 ssl http2;
    server_name tu-dominio.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSE (streaming de IA)
    location /api/v1/sessions/ {
        proxy_pass http://localhost:8000/api/v1/sessions/;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
    }
}
```

---

## Desinstalar

```bash
# Detener y eliminar todo
docker compose down -v

# Eliminar imágenes
docker rmi martin-coder-api:2.0 martin-coder-web:2.0

# Eliminar archivo .env (opcional)
rm .env
```

---

## URLs de acceso

| Servicio | URL |
|---------|-----|
| Web UI | http://localhost:3000 |
| API | http://localhost:8000 |
| API Health | http://localhost:8000/health |
| OpenAPI Spec | http://localhost:8000/openapi.json |

---

*Martin-Coder v2.0 — Docker Guide — 2026*
