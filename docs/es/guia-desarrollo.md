# Guía de Desarrollo

Guía para desarrolladores que quieran contribuir o extender Martin-Coder.

## Tabla de Contenidos

- [Visión General de la Arquitectura](#visión-general-de-la-arquitectura)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Configuración de Desarrollo](#configuración-de-desarrollo)
- [Desarrollo del Backend](#desarrollo-del-backend)
- [Desarrollo del Frontend](#desarrollo-del-frontend)
- [Desarrollo del CLI](#desarrollo-del-cli)
- [Agregar Proveedores de IA](#agregar-proveedores-de-ia)
- [Crear Herramientas](#crear-herramientas)
- [Desarrollo de Plugins](#desarrollo-de-plugins)
- [Testing](#testing)
- [Estilo de Código](#estilo-de-código)
- [Contribuir](#contribuir)

---

## Visión General de la Arquitectura

Martin-Coder sigue una arquitectura modular:

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (Next.js)                     │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│   │  Chat   │  │Proyectos│  │  Drive  │  │ Config  │       │
│   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │
└────────┼────────────┼────────────┼────────────┼────────────┘
         │            │            │            │
         └────────────┴─────┬──────┴────────────┘
                            │ REST API / WebSocket
         ┌──────────────────┴──────────────────┐
         │           Backend (FastAPI)          │
         │  ┌──────────────────────────────┐   │
         │  │        API Endpoints          │   │
         │  └──────────────┬───────────────┘   │
         │  ┌──────────────┴───────────────┐   │
         │  │          Servicios            │   │
         │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ │   │
         │  │  │ IA │ │RAG │ │File│ │Auth│ │   │
         │  │  └────┘ └────┘ └────┘ └────┘ │   │
         │  └──────────────────────────────┘   │
         └──────────────────┬──────────────────┘
                            │
    ┌───────────┬───────────┼───────────┬───────────┐
    │           │           │           │           │
┌───┴───┐ ┌─────┴─────┐ ┌───┴───┐ ┌─────┴─────┐ ┌───┴───┐
│SQLite │ │PostgreSQL │ │ChromaDB│ │  Redis   │ │FS/Git │
└───────┘ └───────────┘ └───────┘ └───────────┘ └───────┘
```

### Componentes

- **Frontend**: Next.js 14 con App Router, React, Tailwind CSS
- **Backend**: FastAPI con SQLAlchemy async, Pydantic v2
- **CLI**: Typer + Rich para UI de terminal
- **RAG**: ChromaDB para almacenamiento vectorial, LangChain para orquestación
- **Base de Datos**: SQLite (dev) / PostgreSQL (prod)
- **Caché**: Redis (opcional)

---

## Estructura del Proyecto

```
martin-coder/
├── apps/
│   ├── api/                    # Backend FastAPI
│   │   ├── app/
│   │   │   ├── api/            # Rutas API
│   │   │   │   ├── endpoints/  # Módulos de endpoints
│   │   │   │   └── routes.py   # Agregación de routers
│   │   │   ├── core/           # Configuración central
│   │   │   │   ├── config.py   # Configuración
│   │   │   │   └── security.py # JWT, hashing
│   │   │   ├── models/         # Modelos SQLAlchemy
│   │   │   ├── schemas/        # Esquemas Pydantic
│   │   │   ├── services/       # Lógica de negocio
│   │   │   │   ├── ai/         # Proveedores de IA
│   │   │   │   └── rag/        # Sistema RAG
│   │   │   └── main.py         # Entrada de aplicación
│   │   ├── alembic/            # Migraciones de BD
│   │   ├── tests/              # Tests del backend
│   │   └── requirements.txt
│   │
│   ├── web/                    # Frontend Next.js
│   │   ├── app/                # Páginas App Router
│   │   ├── components/         # Componentes React
│   │   ├── lib/                # Utilidades
│   │   │   ├── api.ts          # Cliente API
│   │   │   └── stores/         # Stores Zustand
│   │   └── package.json
│   │
│   └── cli/                    # Aplicación CLI
│       ├── martin_coder_cli/
│       │   ├── commands/       # Comandos CLI
│       │   └── main.py
│       └── setup.py
│
├── docs/                       # Documentación
│   ├── en/                     # Docs en inglés
│   └── es/                     # Docs en español
│
├── templates/                  # Plantillas de proyecto
├── plugins/                    # Directorio de plugins
├── docker-compose.yml
└── README.md
```

---

## Configuración de Desarrollo

### Prerrequisitos

```bash
# Instalar Python 3.11+
pyenv install 3.11
pyenv local 3.11

# Instalar Node.js 20+
nvm install 20
nvm use 20

# Instalar dependencias
cd apps/api && pip install -r requirements.txt
cd apps/web && npm install
```

### Configuración del Entorno

```bash
# Copiar archivos de entorno
cp .env.example .env

# Requerido para desarrollo
DATABASE_URL=sqlite:///./data/martin_coder.db
SECRET_KEY=dev-secret-key-cambiar-en-produccion
DEBUG=true

# Al menos un proveedor de IA
ANTHROPIC_API_KEY=sk-ant-...
```

### Ejecutar en Desarrollo

**Terminal 1 - Backend:**
```bash
cd apps/api
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
npm run dev
```

**Terminal 3 - CLI (opcional):**
```bash
cd apps/cli
pip install -e .
martin-coder --help
```

---

## Desarrollo del Backend

### Agregar un Nuevo Endpoint

1. **Crear el esquema** (`app/schemas/nueva_funcionalidad.py`):

```python
from pydantic import BaseModel

class NuevaFuncionalidadCreate(BaseModel):
    name: str
    description: str | None = None

class NuevaFuncionalidadResponse(BaseModel):
    id: str
    name: str
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True
```

2. **Crear el modelo** (`app/models/nueva_funcionalidad.py`):

```python
from sqlalchemy import Column, String, DateTime
from app.models.base import Base

class NuevaFuncionalidad(Base):
    __tablename__ = "nuevas_funcionalidades"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
```

3. **Crear el endpoint** (`app/api/endpoints/nueva_funcionalidad.py`):

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.schemas.nueva_funcionalidad import NuevaFuncionalidadCreate, NuevaFuncionalidadResponse

router = APIRouter()

@router.post("/", response_model=NuevaFuncionalidadResponse)
async def crear_funcionalidad(
    data: NuevaFuncionalidadCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    funcionalidad = NuevaFuncionalidad(**data.model_dump())
    db.add(funcionalidad)
    await db.commit()
    return funcionalidad
```

4. **Registrar el router** (`app/api/routes.py`):

```python
from app.api.endpoints import nueva_funcionalidad
api_router.include_router(
    nueva_funcionalidad.router,
    prefix="/nueva-funcionalidad",
    tags=["Nueva Funcionalidad"]
)
```

### Migraciones de Base de Datos

```bash
# Crear migración
alembic revision --autogenerate -m "Agregar tabla nuevas_funcionalidades"

# Aplicar migración
alembic upgrade head

# Revertir
alembic downgrade -1
```

---

## Desarrollo del Frontend

### Crear un Componente

```tsx
// components/feature/feature-card.tsx
"use client";

import { useState } from "react";

interface FeatureCardProps {
  title: string;
  description?: string;
  onAction?: () => void;
}

export function FeatureCard({ title, description, onAction }: FeatureCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onAction?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
      <h3 className="font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded"
      >
        {isLoading ? "Cargando..." : "Acción"}
      </button>
    </div>
  );
}
```

### Crear un Store (Zustand)

```typescript
// lib/stores/feature-store.ts
import { create } from "zustand";
import { api } from "@/lib/api";

interface Feature {
  id: string;
  name: string;
}

interface FeatureStore {
  features: Feature[];
  loading: boolean;
  fetchFeatures: () => Promise<void>;
  createFeature: (name: string) => Promise<void>;
}

export const useFeatureStore = create<FeatureStore>((set, get) => ({
  features: [],
  loading: false,

  fetchFeatures: async () => {
    set({ loading: true });
    try {
      const features = await api.request<Feature[]>("/api/v1/features");
      set({ features });
    } finally {
      set({ loading: false });
    }
  },

  createFeature: async (name: string) => {
    const feature = await api.request<Feature>("/api/v1/features", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    set({ features: [...get().features, feature] });
  },
}));
```

---

## Agregar Proveedores de IA

### Interfaz del Proveedor

Todos los proveedores de IA implementan esta interfaz:

```python
# app/services/ai/providers/base.py
from abc import ABC, abstractmethod
from typing import AsyncGenerator

class AIProvider(ABC):
    @abstractmethod
    async def chat(
        self,
        messages: list[dict],
        model: str,
        temperature: float = 0.7,
        tools: list[dict] | None = None,
    ) -> dict:
        """Enviar solicitud de chat completion."""
        pass

    @abstractmethod
    async def stream_chat(
        self,
        messages: list[dict],
        model: str,
        temperature: float = 0.7,
        tools: list[dict] | None = None,
    ) -> AsyncGenerator[dict, None]:
        """Transmitir respuesta de chat completion."""
        pass

    @abstractmethod
    async def list_models(self) -> list[dict]:
        """Listar modelos disponibles."""
        pass
```

### Crear un Nuevo Proveedor

```python
# app/services/ai/providers/nuevo_proveedor.py
from .base import AIProvider

class NuevoProveedor(AIProvider):
    def __init__(self, api_key: str, base_url: str | None = None):
        self.api_key = api_key
        self.base_url = base_url or "https://api.nuevoproveedor.com"
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {api_key}"}
        )

    async def chat(self, messages, model, temperature=0.7, tools=None):
        response = await self.client.post(
            "/v1/chat/completions",
            json={
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "tools": tools,
            }
        )
        return response.json()

    async def stream_chat(self, messages, model, temperature=0.7, tools=None):
        async with self.client.stream(
            "POST",
            "/v1/chat/completions",
            json={
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "stream": True,
            }
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    yield json.loads(line[6:])

    async def list_models(self):
        response = await self.client.get("/v1/models")
        return response.json()["data"]
```

---

## Crear Herramientas

Las herramientas de IA permiten al modelo interactuar con sistemas externos.

### Definición de Herramienta

```python
# app/services/ai/tools/herramienta_custom.py
from .base import BaseTool, ToolResult

class HerramientaCustom(BaseTool):
    name = "herramienta_custom"
    description = "Descripción de lo que hace esta herramienta"

    parameters = {
        "type": "object",
        "properties": {
            "input": {
                "type": "string",
                "description": "Parámetro de entrada"
            }
        },
        "required": ["input"]
    }

    async def execute(self, input: str) -> ToolResult:
        try:
            # Lógica de la herramienta aquí
            result = f"Procesado: {input}"
            return ToolResult(success=True, output=result)
        except Exception as e:
            return ToolResult(success=False, error=str(e))
```

### Registrar Herramientas

```python
# app/services/ai/tools/__init__.py
from .file_tools import ReadFileTool, WriteFileTool
from .search_tools import SearchTool
from .herramienta_custom import HerramientaCustom

AVAILABLE_TOOLS = {
    "read_file": ReadFileTool,
    "write_file": WriteFileTool,
    "search": SearchTool,
    "herramienta_custom": HerramientaCustom,
}
```

---

## Desarrollo de Plugins

### Estructura del Plugin

```
mi-plugin/
├── plugin.json
├── __init__.py
├── tools/
│   └── mi_herramienta.py
└── hooks/
    └── mi_hook.py
```

### Manifiesto del Plugin

```json
{
  "name": "mi-plugin",
  "version": "1.0.0",
  "description": "Mi plugin personalizado",
  "author": "Tu Nombre",
  "hooks": ["pre_message", "post_message"],
  "tools": ["mi_herramienta_custom"],
  "settings": {
    "api_key": {
      "type": "string",
      "required": true
    }
  }
}
```

### Implementación del Plugin

```python
# __init__.py
from martin_coder.plugins import Plugin, hook

class MiPlugin(Plugin):
    name = "mi-plugin"

    @hook("pre_message")
    async def antes_mensaje(self, message: str, context: dict):
        # Modificar mensaje antes de enviar a IA
        return message.upper()

    @hook("post_message")
    async def despues_mensaje(self, response: str, context: dict):
        # Procesar respuesta después de recibir de IA
        return response
```

---

## Testing

### Tests del Backend

```bash
cd apps/api
pytest tests/ -v

# Con cobertura
pytest tests/ --cov=app --cov-report=html
```

### Ejemplo de Test

```python
# tests/test_chat.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_crear_chat():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/chat",
            json={"title": "Test Chat"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 201
        assert response.json()["title"] == "Test Chat"
```

### Tests del Frontend

```bash
cd apps/web
npm test

# Con cobertura
npm test -- --coverage
```

---

## Estilo de Código

### Python

- Usa **Black** para formato
- Usa **isort** para imports
- Usa **mypy** para verificación de tipos
- Sigue PEP 8

```bash
# Formatear
black app/
isort app/

# Verificar tipos
mypy app/
```

### TypeScript

- Usa **ESLint** + **Prettier**
- Sigue la configuración ESLint del proyecto

```bash
npm run lint
npm run format
```

---

## Contribuir

### Flujo de Trabajo

1. Haz fork del repositorio
2. Crea una rama de feature: `git checkout -b feature/mi-feature`
3. Realiza tus cambios
4. Ejecuta tests: `pytest` y `npm test`
5. Commit: `git commit -m "feat: agregar mi feature"`
6. Push: `git push origin feature/mi-feature`
7. Abre un Pull Request

### Mensajes de Commit

Sigue [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Documentación
- `style:` Estilo de código (sin cambio de lógica)
- `refactor:` Refactorización de código
- `test:` Tests
- `chore:` Mantenimiento

### Guías para Pull Request

1. Incluye tests para nuevas funcionalidades
2. Actualiza la documentación si es necesario
3. Asegúrate de que el CI pase
4. Solicita revisión a los mantenedores
