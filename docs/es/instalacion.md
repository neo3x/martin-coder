# Guía de Instalación

Esta guía cubre todos los métodos de instalación para Martin-Coder.

## Tabla de Contenidos

- [Requisitos del Sistema](#requisitos-del-sistema)
- [Métodos de Instalación](#métodos-de-instalación)
  - [Instalación con Docker (Recomendado)](#instalación-con-docker-recomendado)
  - [Instalación Nativa](#instalación-nativa)
  - [Instalación Solo CLI](#instalación-solo-cli)
- [Configuración Post-Instalación](#configuración-post-instalación)
- [Solución de Problemas](#solución-de-problemas)

---

## Requisitos del Sistema

### Software Requerido

| Software | Versión Mínima | Descarga |
|----------|----------------|----------|
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| Git | 2.40+ | [git-scm.com](https://git-scm.com) |

### Software Opcional

| Software | Propósito | Descarga |
|----------|-----------|----------|
| Docker | Despliegue containerizado | [docker.com](https://docker.com) |
| Docker Compose | Orquestación multi-contenedor | Incluido con Docker Desktop |
| PostgreSQL | Base de datos de producción | [postgresql.org](https://postgresql.org) |
| Redis | Caché y colas | [redis.io](https://redis.io) |
| LM Studio | Soporte LLM local | [lmstudio.ai](https://lmstudio.ai) |
| Ollama | Soporte LLM local | [ollama.ai](https://ollama.ai) |

### Requisitos de Hardware

| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| CPU | 4 núcleos | 8+ núcleos |
| RAM | 8 GB | 16+ GB |
| Almacenamiento | 10 GB | 50+ GB (para modelos locales) |
| GPU | No requerida | NVIDIA GPU (para LLMs locales) |

---

## Métodos de Instalación

### Instalación con Docker (Recomendado)

La forma más fácil de comenzar con Martin-Coder.

#### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/neo3x/martin-coder.git
cd martin-coder
```

#### Paso 2: Configurar Entorno

```bash
# Copiar archivo de entorno de ejemplo
cp .env.example .env

# Editar la configuración
nano .env  # o usa tu editor preferido
```

**Configuración requerida:**
```env
# Como mínimo, configura un proveedor de IA:
ANTHROPIC_API_KEY=sk-ant-tu-clave-aqui
# O
OPENAI_API_KEY=sk-tu-clave-aqui

# Seguridad (genera una clave segura)
SECRET_KEY=tu-clave-super-secreta-cambia-esto
```

#### Paso 3: Iniciar la Aplicación

```bash
# Modo producción
docker-compose up -d

# O modo desarrollo con recarga automática
docker-compose -f docker-compose.dev.yml up
```

#### Paso 4: Acceder a la Aplicación

- **Interfaz Web**: http://localhost:3005
- **API**: http://localhost:8000
- **Documentación API**: http://localhost:8000/docs

#### Referencia de Comandos Docker

```bash
# Iniciar servicios
docker-compose up -d

# Detener servicios
docker-compose down

# Ver logs
docker-compose logs -f

# Reconstruir contenedores
docker-compose up -d --build

# Eliminar todos los datos (incluyendo base de datos)
docker-compose down -v
```

---

### Instalación Nativa

Para desarrollo o cuando Docker no está disponible.

#### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/neo3x/martin-coder.git
cd martin-coder
```

#### Paso 2: Configuración del Backend

```bash
cd apps/api

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Copiar configuración de entorno
cp ../../.env.example .env
```

#### Paso 3: Configuración de Base de Datos

**Opción A: SQLite (Simple)**
```env
DATABASE_URL=sqlite:///./data/martin_coder.db
```

**Opción B: PostgreSQL (Producción)**
```bash
# Crear base de datos
createdb martin_coder

# Configurar en .env
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/martin_coder
```

**Ejecutar migraciones:**
```bash
alembic upgrade head
```

#### Paso 4: Configuración del Frontend

```bash
cd ../web

# Instalar dependencias
npm install

# Copiar entorno (si es necesario)
cp .env.example .env.local
```

#### Paso 5: Iniciar Servicios

**Terminal 1 - Backend:**
```bash
cd apps/api
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
npm run dev
```

---

### Instalación Solo CLI

Instala solo la interfaz de línea de comandos.

#### Desde PyPI (Cuando se Publique)

```bash
pip install martin-coder-cli
```

#### Desde Código Fuente

```bash
cd apps/cli
pip install -e .
```

#### Verificar Instalación

```bash
martin-coder --version
martin-coder --help
```

---

## Configuración Post-Instalación

### 1. Crear Cuenta de Administrador

En la primera ejecución, crea una cuenta de administrador:

```bash
# Vía API
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@ejemplo.com", "username": "admin", "password": "contraseñasegura"}'
```

O usa el formulario de registro en la interfaz web.

### 2. Configurar Proveedores de IA

Edita tu archivo `.env` con las claves API:

```env
# Claude (Anthropic)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
OPENAI_API_KEY=sk-...

# LLMs Locales
LMSTUDIO_URL=http://localhost:1234/v1
LMSTUDIO_ENABLED=true

OLLAMA_URL=http://localhost:11434
OLLAMA_ENABLED=true
```

### 3. Configurar OAuth (Opcional)

Para login con GitHub/Google:

```env
# GitHub
GITHUB_CLIENT_ID=tu-client-id
GITHUB_CLIENT_SECRET=tu-client-secret

# Google
GOOGLE_CLIENT_ID=tu-client-id
GOOGLE_CLIENT_SECRET=tu-client-secret
```

### 4. Configurar LLMs Locales (Opcional)

**LM Studio:**
1. Descarga desde [lmstudio.ai](https://lmstudio.ai)
2. Carga un modelo (ej. CodeLlama, DeepSeek-Coder)
3. Inicia el servidor local
4. Configura `LMSTUDIO_ENABLED=true` en `.env`

**Ollama:**
```bash
# Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Descargar un modelo
ollama pull codellama

# Ollama se ejecuta automáticamente
```

---

## Solución de Problemas

### Problemas Comunes

#### Puerto en Uso

```bash
# Encontrar proceso usando el puerto
lsof -i :8000
# o en Windows
netstat -ano | findstr :8000

# Matar el proceso o usar otro puerto
uvicorn app.main:app --port 8001
```

#### Error de Conexión a Base de Datos

```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Verificar cadena de conexión en .env
DATABASE_URL=postgresql://usuario:pass@localhost:5432/martin_coder
```

#### Permiso Denegado en Docker

```bash
# Agregar usuario al grupo docker
sudo usermod -aG docker $USER

# Cerrar sesión y volver a entrar, o:
newgrp docker
```

#### Error de Versión de Node.js

```bash
# Instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Instalar Node.js 20
nvm install 20
nvm use 20
```

#### Error de Versión de Python

```bash
# Instalar pyenv
curl https://pyenv.run | bash

# Instalar Python 3.11
pyenv install 3.11
pyenv local 3.11
```

### Obtener Ayuda

- Consulta las [Preguntas Frecuentes](faq.md)
- Busca en [GitHub Issues](https://github.com/neo3x/martin-coder/issues)
- Únete a nuestras [Discusiones](https://github.com/neo3x/martin-coder/discussions)
