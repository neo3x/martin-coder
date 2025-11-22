# User Manual

Complete guide to using Martin-Coder for AI-assisted code generation.

## Table of Contents

- [Getting Started](#getting-started)
- [Dashboard Overview](#dashboard-overview)
- [Chat Interface](#chat-interface)
- [Project Management](#project-management)
- [AI Providers](#ai-providers)
- [Google Drive Integration](#google-drive-integration)
- [GitHub Integration](#github-integration)
- [Templates](#templates)
- [Plugins](#plugins)
- [CLI Usage](#cli-usage)
- [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Getting Started

### First Login

1. Navigate to `http://localhost:3000` in your browser
2. Click "Register" to create a new account
3. Enter your email, username, and password
4. You'll be redirected to the dashboard

### Quick Start

1. **Create a Project**: Click "+ Open Project" in the sidebar
2. **Start a Chat**: Click "New Chat" to begin an AI conversation
3. **Ask Questions**: Type your coding question or request
4. **Review Code**: The AI will generate code with explanations
5. **Apply Changes**: Use the provided tools to apply code to your project

---

## Dashboard Overview

### Sidebar

The left sidebar contains:

- **New Chat**: Start a new AI conversation
- **Chat History**: List of previous conversations
- **Projects**: Access your connected projects
- **Integrations**: Google Drive and GitHub connections

### Header

The top header provides:

- **Search**: Global search across chats and projects
- **Notifications**: System alerts and updates
- **Settings**: Access user preferences
- **Profile**: Account management

---

## Chat Interface

### Starting a Conversation

1. Click "New Chat" or select an existing chat
2. Type your message in the input field
3. Press Enter or click Send

### Message Types

- **Text Messages**: Regular conversation with the AI
- **Code Blocks**: Syntax-highlighted code snippets
- **Tool Calls**: AI-executed actions (file read/write, search, etc.)
- **System Messages**: Status updates and notifications

### Using Tools

Martin-Coder's AI can use various tools:

| Tool | Description | Example |
|------|-------------|---------|
| File Read | Read file contents | "Read the main.py file" |
| File Write | Create or update files | "Create a new config file" |
| File Search | Search for files | "Find all Python files" |
| Code Search | Search in code | "Find functions named 'process'" |
| Terminal | Execute commands | "Run the tests" |
| Web Search | Search the internet | "Find documentation for FastAPI" |

### Context Awareness

The AI understands your project context:

- **File Tree**: Knows your project structure
- **Code Analysis**: Understands dependencies and imports
- **Git History**: Aware of recent changes
- **RAG Index**: Searches your codebase semantically

### Best Practices

1. **Be Specific**: "Add input validation to the login form" is better than "fix the form"
2. **Provide Context**: Mention relevant files or features
3. **Ask for Explanations**: Request comments and documentation
4. **Review Changes**: Always review AI-generated code before applying
5. **Iterate**: Refine requests if the first response isn't perfect

---

## Project Management

### Creating a Project

1. Click "+ Open Project" in the sidebar
2. Choose a method:
   - **Local Path**: Select a folder on your computer
   - **Git Clone**: Enter a repository URL
   - **Template**: Start from a project template

### Project Actions

| Action | Description |
|--------|-------------|
| Analyze | Scan project structure and dependencies |
| Index | Create RAG index for semantic search |
| Sync | Update file tree and metadata |
| Settings | Configure project-specific options |

### Project Settings

- **Name**: Display name for the project
- **Description**: Project description
- **AI Provider**: Preferred AI model for this project
- **Auto-Index**: Automatically update the search index
- **File Patterns**: Include/exclude file patterns

---

## AI Providers

### Available Providers

| Provider | Models | Best For |
|----------|--------|----------|
| Anthropic (Claude) | Claude 3.5 Sonnet, Claude 3 Opus | Complex reasoning, long context |
| OpenAI | GPT-4, GPT-4 Turbo, GPT-3.5 | General coding tasks |
| LM Studio | Local models | Privacy, offline use |
| Ollama | Local models | Privacy, offline use |

### Configuring Providers

1. Go to Settings > AI Providers
2. Enter your API key for cloud providers
3. For local providers, ensure the server is running
4. Select your default provider and model

### Switching Providers

You can switch providers per-chat:

1. Open a chat
2. Click the model selector in the header
3. Choose a different provider/model
4. New messages will use the selected model

### Cost Considerations

- **Cloud Providers**: Charged per token (input + output)
- **Local Models**: Free but require hardware resources
- **Recommendation**: Use local models for exploration, cloud for complex tasks

---

## Google Drive Integration

### Connecting Your Drive

1. Navigate to the Drive section in the sidebar
2. Click "Connect Google Drive"
3. Sign in with your Google account
4. Grant the requested permissions

### Features

- **Browse Files**: Navigate your Drive folders
- **Search**: Find files by name or content
- **Download**: Download files to your project
- **Sync**: Keep folders synchronized

### Use Cases

- **Backup Projects**: Sync your code to Drive
- **Collaboration**: Access shared files
- **Documentation**: Import specs and requirements
- **Assets**: Manage images and resources

### Security

- Only requested scopes are used
- Tokens are encrypted at rest
- You can revoke access anytime from Google settings

---

## GitHub Integration

### Connecting GitHub

1. Go to Settings > Integrations
2. Click "Connect GitHub"
3. Authorize Martin-Coder
4. Select repositories to access

### Features

- **Clone Repositories**: Import projects from GitHub
- **Push Changes**: Commit and push from the UI
- **Pull Requests**: Create and review PRs
- **Issues**: View and manage issues
- **Actions**: Monitor workflow status

### OAuth Scopes

Martin-Coder requests:

- `repo`: Full access to repositories
- `read:user`: Read user profile
- `user:email`: Access email addresses

---

## Templates

### Using Templates

1. Click "New Project" > "From Template"
2. Browse available templates
3. Select a template and customize
4. Click "Create Project"

### Available Templates

| Template | Description |
|----------|-------------|
| FastAPI Backend | Python REST API with authentication |
| Next.js App | React frontend with App Router |
| Full Stack | Combined frontend and backend |
| CLI Tool | Python command-line application |
| MCP Server | Model Context Protocol server |

### Creating Custom Templates

1. Create a `templates/` folder in your config
2. Add a `template.json` manifest:

```json
{
  "name": "My Template",
  "description": "Custom project template",
  "variables": {
    "project_name": "string",
    "author": "string"
  }
}
```

3. Add template files with Jinja2 placeholders

---

## Plugins

### Plugin System

Martin-Coder supports plugins that extend functionality:

- **Tools**: Add new AI tools
- **Providers**: Add AI provider integrations
- **Hooks**: Execute code on events
- **Commands**: Add CLI commands

### Installing Plugins

```bash
# Via CLI
martin-coder plugin install <plugin-name>

# Via API
POST /api/v1/plugins/install
```

### Managing Plugins

1. Go to Settings > Plugins
2. View installed plugins
3. Enable/disable as needed
4. Configure plugin settings

---

## CLI Usage

### Basic Commands

```bash
# Start a chat session
martin-coder chat

# Open a project
martin-coder project open /path/to/project

# Send a message
martin-coder chat send "Explain this code"

# List chats
martin-coder chat list

# Get AI response
martin-coder ask "How do I implement authentication?"
```

### Interactive Mode

```bash
# Start interactive session
martin-coder

# In interactive mode:
> /help          # Show help
> /project       # Project commands
> /chat          # Chat commands
> /settings      # Settings
> /exit          # Exit
```

### Configuration

```bash
# Set API key
martin-coder config set ANTHROPIC_API_KEY sk-ant-...

# Set default model
martin-coder config set DEFAULT_MODEL claude-3-5-sonnet

# View configuration
martin-coder config show
```

---

## Keyboard Shortcuts

### Global

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open command palette |
| `Ctrl+/` | Toggle sidebar |
| `Ctrl+N` | New chat |
| `Ctrl+P` | Quick project switch |
| `Ctrl+,` | Open settings |

### Chat

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in message |
| `Ctrl+Shift+C` | Copy last response |
| `Ctrl+Z` | Undo last action |
| `Escape` | Cancel current action |

### Editor

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save file |
| `Ctrl+F` | Find in file |
| `Ctrl+Shift+F` | Find in project |
| `Ctrl+G` | Go to line |
| `Ctrl+D` | Select next occurrence |

---

## Tips & Tricks

### Effective Prompting

1. **Start with Context**: "In my FastAPI project with SQLAlchemy..."
2. **Be Specific**: "Add pagination to the GET /users endpoint"
3. **Request Format**: "Respond with only the code, no explanations"
4. **Ask for Tests**: "Include unit tests for this function"

### Performance

1. **Index Your Project**: Faster semantic search
2. **Use Local Models**: For sensitive code
3. **Batch Operations**: Group related changes
4. **Clear Old Chats**: Reduce context size

### Security

1. **Review Generated Code**: Never blindly apply changes
2. **Check Dependencies**: Verify suggested packages
3. **Protect Secrets**: Never paste API keys in chat
4. **Use .gitignore**: Exclude sensitive files
