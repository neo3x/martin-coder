"""
Built-in Project Templates
"""

from app.services.templates.manager import ProjectTemplate, TemplateFile

# Python FastAPI Template
FASTAPI_TEMPLATE = ProjectTemplate(
    id="python-fastapi",
    name="FastAPI REST API",
    description="A modern Python REST API with FastAPI, async support, and OpenAPI docs",
    language="Python",
    framework="FastAPI",
    category="backend",
    tags=["api", "rest", "python", "async"],
    variables={
        "project_name": "my_api",
        "description": "A FastAPI application",
        "python_version": "3.11"
    },
    files=[
        TemplateFile(
            path="{{project_name}}/__init__.py",
            content='"""{{description}}"""\n\n__version__ = "0.1.0"\n'
        ),
        TemplateFile(
            path="{{project_name}}/main.py",
            content='''"""
{{description}}
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="{{project_name}}",
    description="{{description}}",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Welcome to {{project_name}}"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
'''
        ),
        TemplateFile(
            path="requirements.txt",
            content='''fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.6.0
python-dotenv>=1.0.0
'''
        ),
        TemplateFile(
            path="Dockerfile",
            content='''FROM python:{{python_version}}-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "{{project_name}}.main:app", "--host", "0.0.0.0", "--port", "8000"]
'''
        ),
        TemplateFile(
            path=".gitignore",
            content='''__pycache__/
*.py[cod]
.env
.venv/
venv/
.pytest_cache/
'''
        ),
        TemplateFile(
            path="README.md",
            content='''# {{project_name}}

{{description}}

## Setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn {{project_name}}.main:app --reload
```

## API Docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
'''
        )
    ],
    post_create_commands=[
        "python -m venv venv",
        "pip install -r requirements.txt"
    ]
)

# React + TypeScript Template
REACT_TS_TEMPLATE = ProjectTemplate(
    id="react-typescript",
    name="React + TypeScript",
    description="Modern React application with TypeScript and Vite",
    language="TypeScript",
    framework="React",
    category="frontend",
    tags=["react", "typescript", "vite", "spa"],
    variables={
        "project_name": "my-react-app",
        "description": "A React application"
    },
    files=[
        TemplateFile(
            path="package.json",
            content='''{
  "name": "{{project_name}}",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}
'''
        ),
        TemplateFile(
            path="tsconfig.json",
            content='''{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
'''
        ),
        TemplateFile(
            path="tsconfig.node.json",
            content='''{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
'''
        ),
        TemplateFile(
            path="vite.config.ts",
            content='''import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
'''
        ),
        TemplateFile(
            path="index.html",
            content='''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{project_name}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
'''
        ),
        TemplateFile(
            path="src/main.tsx",
            content='''import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
'''
        ),
        TemplateFile(
            path="src/App.tsx",
            content='''import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <h1>{{project_name}}</h1>
      <p>{{description}}</p>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
    </div>
  )
}

export default App
'''
        ),
        TemplateFile(
            path="src/index.css",
            content='''* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
}

.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
}
'''
        ),
        TemplateFile(
            path=".gitignore",
            content='''node_modules/
dist/
.env
.env.local
'''
        ),
        TemplateFile(
            path="README.md",
            content='''# {{project_name}}

{{description}}

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```
'''
        )
    ],
    post_create_commands=["npm install"]
)

# Node.js Express Template
EXPRESS_TEMPLATE = ProjectTemplate(
    id="node-express",
    name="Express.js API",
    description="Node.js REST API with Express and TypeScript",
    language="TypeScript",
    framework="Express",
    category="backend",
    tags=["api", "rest", "node", "express", "typescript"],
    variables={
        "project_name": "my-express-api",
        "description": "An Express.js API"
    },
    files=[
        TemplateFile(
            path="package.json",
            content='''{
  "name": "{{project_name}}",
  "version": "0.1.0",
  "description": "{{description}}",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.1",
    "express": "^4.18.2",
    "helmet": "^7.1.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.16",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.3"
  }
}
'''
        ),
        TemplateFile(
            path="tsconfig.json",
            content='''{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
'''
        ),
        TemplateFile(
            path="src/index.ts",
            content='''import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to {{project_name}}' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
'''
        ),
        TemplateFile(
            path=".env.example",
            content='''PORT=3000
NODE_ENV=development
'''
        ),
        TemplateFile(
            path=".gitignore",
            content='''node_modules/
dist/
.env
'''
        ),
        TemplateFile(
            path="README.md",
            content='''# {{project_name}}

{{description}}

## Setup

```bash
npm install
cp .env.example .env
```

## Development

```bash
npm run dev
```

## Production

```bash
npm run build
npm start
```
'''
        )
    ],
    post_create_commands=["npm install"]
)

# Next.js Template
NEXTJS_TEMPLATE = ProjectTemplate(
    id="nextjs-app",
    name="Next.js Application",
    description="Full-stack Next.js application with App Router",
    language="TypeScript",
    framework="Next.js",
    category="fullstack",
    tags=["nextjs", "react", "typescript", "fullstack"],
    variables={
        "project_name": "my-nextjs-app",
        "description": "A Next.js application"
    },
    files=[
        TemplateFile(
            path="package.json",
            content='''{
  "name": "{{project_name}}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.1.0",
    "typescript": "^5"
  }
}
'''
        ),
        TemplateFile(
            path="tsconfig.json",
            content='''{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
'''
        ),
        TemplateFile(
            path="next.config.js",
            content='''/** @type {import('next').NextConfig} */
const nextConfig = {}
module.exports = nextConfig
'''
        ),
        TemplateFile(
            path="app/layout.tsx",
            content='''import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '{{project_name}}',
  description: '{{description}}',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
'''
        ),
        TemplateFile(
            path="app/page.tsx",
            content='''export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>{{project_name}}</h1>
      <p>{{description}}</p>
    </main>
  )
}
'''
        ),
        TemplateFile(
            path=".gitignore",
            content='''node_modules/
.next/
out/
.env*.local
'''
        ),
        TemplateFile(
            path="README.md",
            content='''# {{project_name}}

{{description}}

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)
'''
        )
    ],
    post_create_commands=["npm install"]
)

# CLI Tool Template
CLI_TEMPLATE = ProjectTemplate(
    id="python-cli",
    name="Python CLI Tool",
    description="Command-line application with Typer and Rich",
    language="Python",
    framework="Typer",
    category="cli",
    tags=["cli", "python", "typer", "terminal"],
    variables={
        "project_name": "my_cli",
        "description": "A CLI tool",
        "command_name": "mycli"
    },
    files=[
        TemplateFile(
            path="{{project_name}}/__init__.py",
            content='__version__ = "0.1.0"\n'
        ),
        TemplateFile(
            path="{{project_name}}/main.py",
            content='''"""
{{description}}
"""

import typer
from rich.console import Console
from rich.panel import Panel

from {{project_name}} import __version__

app = typer.Typer(
    name="{{command_name}}",
    help="{{description}}"
)
console = Console()


@app.callback()
def callback():
    """{{description}}"""
    pass


@app.command()
def hello(name: str = typer.Argument("World", help="Name to greet")):
    """Say hello"""
    console.print(Panel(f"Hello, [bold green]{name}[/bold green]!"))


@app.command()
def version():
    """Show version"""
    console.print(f"{{command_name}} version {__version__}")


if __name__ == "__main__":
    app()
'''
        ),
        TemplateFile(
            path="pyproject.toml",
            content='''[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[project]
name = "{{project_name}}"
version = "0.1.0"
description = "{{description}}"
requires-python = ">=3.9"
dependencies = [
    "typer>=0.9.0",
    "rich>=13.0.0",
]

[project.scripts]
{{command_name}} = "{{project_name}}.main:app"
'''
        ),
        TemplateFile(
            path=".gitignore",
            content='''__pycache__/
*.egg-info/
dist/
build/
.venv/
'''
        ),
        TemplateFile(
            path="README.md",
            content='''# {{project_name}}

{{description}}

## Installation

```bash
pip install -e .
```

## Usage

```bash
{{command_name}} --help
{{command_name}} hello
{{command_name}} hello YourName
```
'''
        )
    ],
    post_create_commands=["pip install -e ."]
)

# All built-in templates
BUILTIN_TEMPLATES = [
    FASTAPI_TEMPLATE,
    REACT_TS_TEMPLATE,
    EXPRESS_TEMPLATE,
    NEXTJS_TEMPLATE,
    CLI_TEMPLATE
]
