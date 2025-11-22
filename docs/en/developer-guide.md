# Developer Guide

Guide for developers who want to contribute to or extend Martin-Coder.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Backend Development](#backend-development)
- [Frontend Development](#frontend-development)
- [CLI Development](#cli-development)
- [Adding AI Providers](#adding-ai-providers)
- [Creating Tools](#creating-tools)
- [Plugin Development](#plugin-development)
- [Testing](#testing)
- [Code Style](#code-style)
- [Contributing](#contributing)

---

## Architecture Overview

Martin-Coder follows a modular architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (Next.js)                     │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│   │  Chat   │  │ Projects│  │  Drive  │  │ Settings│       │
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
         │  │          Services             │   │
         │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ │   │
         │  │  │ AI │ │RAG │ │File│ │Auth│ │   │
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

### Components

- **Frontend**: Next.js 14 with App Router, React, Tailwind CSS
- **Backend**: FastAPI with async SQLAlchemy, Pydantic v2
- **CLI**: Typer + Rich for terminal UI
- **RAG**: ChromaDB for vector storage, LangChain for orchestration
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Cache**: Redis (optional)

---

## Project Structure

```
martin-coder/
├── apps/
│   ├── api/                    # Backend FastAPI
│   │   ├── app/
│   │   │   ├── api/            # API routes
│   │   │   │   ├── endpoints/  # Endpoint modules
│   │   │   │   └── routes.py   # Router aggregation
│   │   │   ├── core/           # Core configuration
│   │   │   │   ├── config.py   # Settings
│   │   │   │   └── security.py # JWT, hashing
│   │   │   ├── models/         # SQLAlchemy models
│   │   │   ├── schemas/        # Pydantic schemas
│   │   │   ├── services/       # Business logic
│   │   │   │   ├── ai/         # AI providers
│   │   │   │   └── rag/        # RAG system
│   │   │   └── main.py         # Application entry
│   │   ├── alembic/            # Database migrations
│   │   ├── tests/              # Backend tests
│   │   └── requirements.txt
│   │
│   ├── web/                    # Frontend Next.js
│   │   ├── app/                # App Router pages
│   │   ├── components/         # React components
│   │   ├── lib/                # Utilities
│   │   │   ├── api.ts          # API client
│   │   │   └── stores/         # Zustand stores
│   │   └── package.json
│   │
│   └── cli/                    # CLI application
│       ├── martin_coder_cli/
│       │   ├── commands/       # CLI commands
│       │   └── main.py
│       └── setup.py
│
├── docs/                       # Documentation
│   ├── en/                     # English docs
│   └── es/                     # Spanish docs
│
├── templates/                  # Project templates
├── plugins/                    # Plugin directory
├── docker-compose.yml
└── README.md
```

---

## Development Setup

### Prerequisites

```bash
# Install Python 3.11+
pyenv install 3.11
pyenv local 3.11

# Install Node.js 20+
nvm install 20
nvm use 20

# Install dependencies
cd apps/api && pip install -r requirements.txt
cd apps/web && npm install
```

### Environment Configuration

```bash
# Copy environment files
cp .env.example .env

# Required for development
DATABASE_URL=sqlite:///./data/martin_coder.db
SECRET_KEY=dev-secret-key-change-in-production
DEBUG=true

# At least one AI provider
ANTHROPIC_API_KEY=sk-ant-...
```

### Running in Development

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

**Terminal 3 - CLI (optional):**
```bash
cd apps/cli
pip install -e .
martin-coder --help
```

---

## Backend Development

### Adding a New Endpoint

1. **Create the schema** (`app/schemas/new_feature.py`):

```python
from pydantic import BaseModel

class NewFeatureCreate(BaseModel):
    name: str
    description: str | None = None

class NewFeatureResponse(BaseModel):
    id: str
    name: str
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True
```

2. **Create the model** (`app/models/new_feature.py`):

```python
from sqlalchemy import Column, String, DateTime
from app.models.base import Base

class NewFeature(Base):
    __tablename__ = "new_features"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
```

3. **Create the endpoint** (`app/api/endpoints/new_feature.py`):

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.schemas.new_feature import NewFeatureCreate, NewFeatureResponse

router = APIRouter()

@router.post("/", response_model=NewFeatureResponse)
async def create_feature(
    data: NewFeatureCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    feature = NewFeature(**data.model_dump())
    db.add(feature)
    await db.commit()
    return feature
```

4. **Register the router** (`app/api/routes.py`):

```python
from app.api.endpoints import new_feature
api_router.include_router(
    new_feature.router,
    prefix="/new-feature",
    tags=["New Feature"]
)
```

### Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "Add new_features table"

# Apply migration
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## Frontend Development

### Creating a Component

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
        {isLoading ? "Loading..." : "Action"}
      </button>
    </div>
  );
}
```

### Creating a Store (Zustand)

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

## Adding AI Providers

### Provider Interface

All AI providers implement this interface:

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
        """Send chat completion request."""
        pass

    @abstractmethod
    async def stream_chat(
        self,
        messages: list[dict],
        model: str,
        temperature: float = 0.7,
        tools: list[dict] | None = None,
    ) -> AsyncGenerator[dict, None]:
        """Stream chat completion response."""
        pass

    @abstractmethod
    async def list_models(self) -> list[dict]:
        """List available models."""
        pass
```

### Creating a New Provider

```python
# app/services/ai/providers/new_provider.py
from .base import AIProvider

class NewProvider(AIProvider):
    def __init__(self, api_key: str, base_url: str | None = None):
        self.api_key = api_key
        self.base_url = base_url or "https://api.newprovider.com"
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

## Creating Tools

AI tools allow the model to interact with external systems.

### Tool Definition

```python
# app/services/ai/tools/custom_tool.py
from .base import BaseTool, ToolResult

class CustomTool(BaseTool):
    name = "custom_tool"
    description = "Description of what this tool does"

    parameters = {
        "type": "object",
        "properties": {
            "input": {
                "type": "string",
                "description": "Input parameter"
            }
        },
        "required": ["input"]
    }

    async def execute(self, input: str) -> ToolResult:
        try:
            # Tool logic here
            result = f"Processed: {input}"
            return ToolResult(success=True, output=result)
        except Exception as e:
            return ToolResult(success=False, error=str(e))
```

### Registering Tools

```python
# app/services/ai/tools/__init__.py
from .file_tools import ReadFileTool, WriteFileTool
from .search_tools import SearchTool
from .custom_tool import CustomTool

AVAILABLE_TOOLS = {
    "read_file": ReadFileTool,
    "write_file": WriteFileTool,
    "search": SearchTool,
    "custom_tool": CustomTool,
}
```

---

## Plugin Development

### Plugin Structure

```
my-plugin/
├── plugin.json
├── __init__.py
├── tools/
│   └── my_tool.py
└── hooks/
    └── my_hook.py
```

### Plugin Manifest

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My custom plugin",
  "author": "Your Name",
  "hooks": ["pre_message", "post_message"],
  "tools": ["my_custom_tool"],
  "settings": {
    "api_key": {
      "type": "string",
      "required": true
    }
  }
}
```

### Plugin Implementation

```python
# __init__.py
from martin_coder.plugins import Plugin, hook

class MyPlugin(Plugin):
    name = "my-plugin"

    @hook("pre_message")
    async def before_message(self, message: str, context: dict):
        # Modify message before sending to AI
        return message.upper()

    @hook("post_message")
    async def after_message(self, response: str, context: dict):
        # Process response after receiving from AI
        return response
```

---

## Testing

### Backend Tests

```bash
cd apps/api
pytest tests/ -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

### Test Example

```python
# tests/test_chat.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_create_chat():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/chat",
            json={"title": "Test Chat"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 201
        assert response.json()["title"] == "Test Chat"
```

### Frontend Tests

```bash
cd apps/web
npm test

# With coverage
npm test -- --coverage
```

---

## Code Style

### Python

- Use **Black** for formatting
- Use **isort** for imports
- Use **mypy** for type checking
- Follow PEP 8

```bash
# Format
black app/
isort app/

# Type check
mypy app/
```

### TypeScript

- Use **ESLint** + **Prettier**
- Follow the project's ESLint config

```bash
npm run lint
npm run format
```

---

## Contributing

### Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `pytest` and `npm test`
5. Commit: `git commit -m "feat: add my feature"`
6. Push: `git push origin feature/my-feature`
7. Open a Pull Request

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style (no logic change)
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

### Pull Request Guidelines

1. Include tests for new features
2. Update documentation if needed
3. Ensure CI passes
4. Request review from maintainers
