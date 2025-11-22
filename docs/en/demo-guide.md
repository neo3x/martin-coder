# Martin-Coder Demo Guide

This guide explains how to set up and run the Martin-Coder demo to showcase its features.

## Quick Start

### One-Command Demo

```bash
# Run the demo setup and start
./scripts/start-demo.sh
```

This will:
1. Set up the demo environment
2. Create sample projects and data
3. Start the backend and frontend
4. Open the demo in your browser

### Manual Setup

```bash
# 1. Run the setup script
python scripts/setup-demo.py

# 2. Start the backend
cd apps/api
uvicorn app.main:app --reload --port 8000

# 3. Start the frontend (new terminal)
cd apps/web
npm run dev
```

## Demo Credentials

| Field | Value |
|-------|-------|
| Email | demo@martin-coder.com |
| Password | demo123 |

## Demo Features

### 1. AI Chat Interface

The chat interface demonstrates:

- **Real-time AI responses** with streaming text
- **Code generation** with syntax highlighting
- **Multi-turn conversations** with context awareness
- **Tool integration** for file operations

**Demo Scenarios:**
- Ask "Create a REST API for user management"
- Ask "Explain how authentication works"
- Ask "Fix the bug in my code"
- Ask "Optimize this database query"

### 2. Project Management

Pre-loaded demo projects:

| Project | Description | Language |
|---------|-------------|----------|
| fastapi-demo | REST API with CRUD operations | Python |
| react-dashboard | Statistics dashboard | TypeScript |
| cli-tool | Command-line tool with Rich UI | Python |

**Features to demonstrate:**
- Browse project files
- Analyze project structure
- Search within code
- View dependencies

### 3. Multi-LLM Support

Show provider switching:

1. Click the provider selector in the header
2. Choose between:
   - Claude (Anthropic)
   - OpenAI (GPT-4)
   - LM Studio (Local)
   - Ollama (Local)
3. Demo mode works without API keys

### 4. Google Drive Integration

Demonstrate cloud storage features:

1. Navigate to **Integrations > Google Drive**
2. Show connection flow
3. Browse files and folders
4. Download/sync capabilities

### 5. GitHub Integration

Show version control features:

1. OAuth connection flow
2. Repository browsing
3. Commit history
4. Pull request creation

### 6. Internationalization

Demonstrate language switching:

1. Click the language selector (flag icon)
2. Switch between English and Spanish
3. All UI elements update immediately
4. Preference is saved automatically

## Demo Walkthrough Script

### Introduction (2 min)

> "Martin-Coder is an AI-powered code generation platform that combines multiple LLM providers with powerful development tools."

**Key Points:**
- Multi-LLM support (Claude, OpenAI, local models)
- Full-featured web interface
- CLI for terminal users
- RAG-powered code search
- Plugin extensibility

### Feature Demo (10 min)

#### Chat Demo (3 min)

1. Create a new chat
2. Type: "Create a FastAPI endpoint for user authentication with JWT"
3. Show streaming response
4. Highlight code generation quality
5. Show tool usage (file read/write)

#### Project Demo (3 min)

1. Open the fastapi-demo project
2. Show file tree navigation
3. Click on main.py to view code
4. Show project analysis
5. Demonstrate code search

#### Integration Demo (2 min)

1. Show Google Drive panel
2. Show GitHub integration
3. Explain OAuth flow

#### Settings Demo (2 min)

1. Show language switching
2. Show provider configuration
3. Show theme options

### Q&A Preparation

**Common Questions:**

Q: "Does it work offline?"
A: "Yes! With LM Studio or Ollama, you can run completely offline with local models."

Q: "What AI models are supported?"
A: "Claude 3.5 Sonnet, GPT-4, GPT-4 Turbo, plus any OpenAI-compatible local model."

Q: "How does the RAG system work?"
A: "We use ChromaDB to index your codebase, allowing semantic search across all files."

Q: "Is it secure?"
A: "Code never leaves your machine with local models. Cloud API calls are encrypted."

Q: "Can I add custom tools?"
A: "Yes! The plugin system allows custom tools, providers, and hooks."

## Demo Troubleshooting

### Backend won't start

```bash
# Check Python version
python --version  # Should be 3.11+

# Install dependencies
cd apps/api
pip install -r requirements.txt
```

### Frontend won't start

```bash
# Check Node version
node --version  # Should be 20+

# Reinstall dependencies
cd apps/web
rm -rf node_modules
npm install
```

### Demo data missing

```bash
# Re-run setup
python scripts/setup-demo.py
```

### Port conflicts

```bash
# Change backend port
uvicorn app.main:app --port 8001

# Change frontend port
npm run dev -- --port 3001
```

## Demo Environment

### Files Created

```
demo_data/
├── martin_coder_demo.db    # SQLite database
├── projects/               # Sample projects
│   ├── fastapi-demo/
│   ├── react-dashboard/
│   └── cli-tool/
├── demo_chats.json         # Sample chat history
└── uploads/                # File upload storage
```

### Environment Variables

```env
DEMO_MODE=true              # Enables demo features
DEBUG=true                  # Verbose logging
DATABASE_URL=sqlite:///./demo_data/martin_coder_demo.db
DEFAULT_AI_PROVIDER=demo    # Uses mock AI responses
```

## Recording a Demo Video

### Recommended Settings

- Resolution: 1920x1080
- Browser: Chrome (dark mode)
- Terminal: VS Code integrated terminal
- Font size: 16px minimum

### Video Outline

1. **Intro** (30s) - Logo, tagline
2. **Overview** (1m) - Dashboard tour
3. **Chat Demo** (3m) - AI interaction
4. **Projects** (2m) - File management
5. **Integrations** (1m) - Google Drive, GitHub
6. **CLI** (1m) - Terminal usage
7. **Outro** (30s) - Call to action

## Live Demo Checklist

- [ ] Demo environment set up
- [ ] All services running
- [ ] Demo credentials ready
- [ ] Sample projects loaded
- [ ] Network connection stable
- [ ] Backup slides prepared
- [ ] Q&A answers reviewed
