# Martin-Coder

Una plataforma de desarrollo asistida por IA con soporte multi-LLM (Claude, OpenAI, LM Studio, Ollama).

## Características

- **Multi-LLM**: Soporte para Claude, OpenAI, LM Studio (local) y Ollama
- **RAG Integrado**: Búsqueda semántica en tu código
- **Sandboxing**: Ejecución segura de código en contenedores Docker
- **Web UI**: Interfaz moderna con Monaco Editor y terminal integrada
- **CLI**: Interfaz de línea de comandos completa
- **Git Nativo**: Integración completa con Git y GitHub
- **Gestión de Usuarios**: Autenticación, sesiones y permisos
- **Self-hosted**: Despliega en tu propia infraestructura

## Requisitos del Sistema

### Instalación Manual Requerida

| Requisito | Versión Mínima | Instalación |
|-----------|----------------|-------------|
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| Docker | 24+ | [docker.com](https://docker.com) |
| Git | 2.40+ | [git-scm.com](https://git-scm.com) |

### Opcionales

| Requisito | Propósito |
|-----------|-----------|
| LM Studio | LLMs locales |
| Ollama | LLMs locales alternativo |

## Instalación

### Opción 1: Docker (Recomendado)

```bash
# Clonar el repositorio
git clone https://github.com/neo3x/martin-coder.git
cd martin-coder

# Copiar configuración
cp .env.example .env

# Editar .env con tus API keys
nano .env

# Iniciar con Docker Compose
docker-compose up -d

# Acceder a la aplicación
# Web UI: http://localhost:3000
# API: http://localhost:8000
```

### Opción 2: Instalación Nativa

```bash
# Clonar el repositorio
git clone https://github.com/neo3x/martin-coder.git
cd martin-coder

# Ejecutar script de instalación
chmod +x scripts/install.sh
./scripts/install.sh

# O instalación manual:

# Backend
cd apps/api
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
pip install -r requirements.txt

# Frontend
cd ../web
npm install

# Iniciar servicios
# Terminal 1 - Backend
cd apps/api && source venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd apps/web && npm run dev
```

### Opción 3: CLI Standalone

```bash
# Instalar CLI globalmente
pip install martin-coder-cli

# O desde el repositorio
cd apps/cli
pip install -e .

# Usar CLI
martin-coder init my-project
martin-coder chat
martin-coder generate "Create a REST API"
```

## Configuración

### Variables de Entorno

```env
# AI Providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
LMSTUDIO_URL=http://localhost:1234
OLLAMA_URL=http://localhost:11434

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/martin_coder
# O para SQLite: sqlite:///./martin_coder.db

# Redis (para cache y colas)
REDIS_URL=redis://localhost:6379

# Auth
SECRET_KEY=your-super-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Sandbox
SANDBOX_ENABLED=true
SANDBOX_TIMEOUT=300
```

## Uso

### Web UI

1. Accede a `http://localhost:3000`
2. Registra una cuenta o inicia sesión
3. Crea un nuevo proyecto o abre uno existente
4. Usa el chat para interactuar con la IA

### CLI

```bash
# Inicializar proyecto
martin-coder init

# Chat interactivo
martin-coder chat

# Generar código
martin-coder generate "Crea un endpoint para usuarios"

# Analizar proyecto
martin-coder analyze

# Ejecutar en sandbox
martin-coder run "python main.py"

# Git operations
martin-coder git commit "feat: add user authentication"
martin-coder git push
```

## Arquitectura

```
martin-coder/
├── apps/
│   ├── api/          # Backend FastAPI
│   ├── web/          # Frontend Next.js
│   └── cli/          # CLI Python
├── packages/
│   └── shared/       # Código compartido
├── docker/           # Dockerfiles
└── scripts/          # Scripts de utilidad
```

## Proveedores de IA Soportados

| Proveedor | Modelos | Tipo |
|-----------|---------|------|
| Claude | claude-sonnet-4-5-20250929, claude-3-opus, claude-3-haiku | Cloud |
| OpenAI | gpt-4o, gpt-4-turbo, gpt-3.5-turbo | Cloud |
| LM Studio | Cualquier modelo cargado | Local |
| Ollama | codellama, deepseek-coder, mistral, etc. | Local |

## Desarrollo

```bash
# Modo desarrollo con hot reload
docker-compose -f docker-compose.dev.yml up

# Tests
cd apps/api && pytest
cd apps/web && npm test

# Linting
cd apps/api && ruff check .
cd apps/web && npm run lint
```

## Licencia

MIT License - ver [LICENSE](LICENSE)
