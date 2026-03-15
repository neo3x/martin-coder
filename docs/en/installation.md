# Installation Guide

This guide covers all installation methods for Martin-Coder.

## Table of Contents

- [System Requirements](#system-requirements)
- [Installation Methods](#installation-methods)
  - [Docker Installation (Recommended)](#docker-installation-recommended)
  - [Native Installation](#native-installation)
  - [CLI-Only Installation](#cli-only-installation)
- [Post-Installation Setup](#post-installation-setup)
- [Troubleshooting](#troubleshooting)

---

## System Requirements

### Required Software

| Software | Minimum Version | Download |
|----------|-----------------|----------|
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| Git | 2.40+ | [git-scm.com](https://git-scm.com) |

### Optional Software

| Software | Purpose | Download |
|----------|---------|----------|
| Docker | Containerized deployment | [docker.com](https://docker.com) |
| Docker Compose | Multi-container orchestration | Included with Docker Desktop |
| PostgreSQL | Production database | [postgresql.org](https://postgresql.org) |
| Redis | Caching and queues | [redis.io](https://redis.io) |
| LM Studio | Local LLM support | [lmstudio.ai](https://lmstudio.ai) |
| Ollama | Local LLM support | [ollama.ai](https://ollama.ai) |

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| Storage | 10 GB | 50+ GB (for local models) |
| GPU | Not required | NVIDIA GPU (for local LLMs) |

---

## Installation Methods

### Docker Installation (Recommended)

The easiest way to get started with Martin-Coder.

#### Step 1: Clone the Repository

```bash
git clone https://github.com/neo3x/martin-coder.git
cd martin-coder
```

#### Step 2: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit the configuration
nano .env  # or use your preferred editor
```

**Required settings:**
```env
# At minimum, configure one AI provider:
ANTHROPIC_API_KEY=sk-ant-your-key-here
# OR
OPENAI_API_KEY=sk-your-key-here

# Security (generate a secure key)
SECRET_KEY=your-super-secret-key-change-this
```

#### Step 3: Start the Application

```bash
# Production mode
docker-compose up -d

# Or development mode with hot reload
docker-compose -f docker-compose.dev.yml up
```

#### Step 4: Access the Application

- **Web UI**: http://localhost:3005
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

#### Docker Commands Reference

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose up -d --build

# Remove all data (including database)
docker-compose down -v
```

---

### Native Installation

For development or when Docker is not available.

#### Step 1: Clone the Repository

```bash
git clone https://github.com/neo3x/martin-coder.git
cd martin-coder
```

#### Step 2: Backend Setup

```bash
cd apps/api

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment configuration
cp ../../.env.example .env
```

#### Step 3: Database Setup

**Option A: SQLite (Simple)**
```env
DATABASE_URL=sqlite:///./data/martin_coder.db
```

**Option B: PostgreSQL (Production)**
```bash
# Create database
createdb martin_coder

# Configure in .env
DATABASE_URL=postgresql://user:password@localhost:5432/martin_coder
```

**Run migrations:**
```bash
alembic upgrade head
```

#### Step 4: Frontend Setup

```bash
cd ../web

# Install dependencies
npm install

# Copy environment (if needed)
cp .env.example .env.local
```

#### Step 5: Start Services

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

### CLI-Only Installation

Install just the command-line interface.

#### From PyPI (When Published)

```bash
pip install martin-coder-cli
```

#### From Source

```bash
cd apps/cli
pip install -e .
```

#### Verify Installation

```bash
martin-coder --version
martin-coder --help
```

---

## Post-Installation Setup

### 1. Create Admin Account

On first run, create an admin account:

```bash
# Via API
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "username": "admin", "password": "securepassword"}'
```

Or use the Web UI registration form.

### 2. Configure AI Providers

Edit your `.env` file with API keys:

```env
# Claude (Anthropic)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
OPENAI_API_KEY=sk-...

# Local LLMs
LMSTUDIO_URL=http://localhost:1234/v1
LMSTUDIO_ENABLED=true

OLLAMA_URL=http://localhost:11434
OLLAMA_ENABLED=true
```

### 3. Configure OAuth (Optional)

For GitHub/Google login:

```env
# GitHub
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret

# Google
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 4. Set Up Local LLMs (Optional)

**LM Studio:**
1. Download from [lmstudio.ai](https://lmstudio.ai)
2. Load a model (e.g., CodeLlama, DeepSeek-Coder)
3. Start the local server
4. Set `LMSTUDIO_ENABLED=true` in `.env`

**Ollama:**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull codellama

# Ollama runs automatically
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :8000
# or on Windows
netstat -ano | findstr :8000

# Kill the process or use different port
uvicorn app.main:app --port 8001
```

#### Database Connection Error

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection string in .env
DATABASE_URL=postgresql://user:pass@localhost:5432/martin_coder
```

#### Docker Permission Denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and log back in, or:
newgrp docker
```

#### Node.js Version Error

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 20
nvm install 20
nvm use 20
```

#### Python Version Error

```bash
# Install pyenv
curl https://pyenv.run | bash

# Install Python 3.11
pyenv install 3.11
pyenv local 3.11
```

### Getting Help

- Check the [FAQ](faq.md)
- Search [GitHub Issues](https://github.com/neo3x/martin-coder/issues)
- Join our [Discussions](https://github.com/neo3x/martin-coder/discussions)
