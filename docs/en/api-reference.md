# API Reference

Complete API documentation for Martin-Coder backend services.

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

Most endpoints require authentication via Bearer token.

```http
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### Register User

```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Login

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### Refresh Token

```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### Get Current User

```http
GET /auth/me
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "is_active": true,
  "preferences": {},
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## Projects

### List Projects

```http
GET /projects
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `skip` | int | Offset for pagination (default: 0) |
| `limit` | int | Max results (default: 100) |

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "my-project",
    "description": "A sample project",
    "local_path": "/path/to/project",
    "git_url": "https://github.com/user/repo",
    "is_indexed": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### Create Project

```http
POST /projects
```

**Request Body:**
```json
{
  "name": "my-project",
  "description": "A sample project",
  "local_path": "/path/to/project",
  "git_url": "https://github.com/user/repo"
}
```

**Response:** `201 Created`

### Get Project

```http
GET /projects/{project_id}
```

**Response:** `200 OK`

### Update Project

```http
PUT /projects/{project_id}
```

### Delete Project

```http
DELETE /projects/{project_id}
```

**Response:** `204 No Content`

### Analyze Project

```http
POST /projects/{project_id}/analyze
```

Analyzes project structure, dependencies, and creates metadata.

**Response:** `200 OK`
```json
{
  "files_count": 150,
  "languages": ["python", "javascript"],
  "frameworks": ["fastapi", "react"],
  "dependencies": {
    "python": ["fastapi", "sqlalchemy"],
    "npm": ["react", "next"]
  }
}
```

### Index Project

```http
POST /projects/{project_id}/index
```

Creates or updates the RAG index for semantic search.

**Response:** `200 OK`
```json
{
  "indexed_files": 150,
  "chunks_created": 1200,
  "index_size_mb": 25.5
}
```

---

## Chat

### List Chats

```http
GET /chat
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `project_id` | uuid | Filter by project |
| `skip` | int | Offset for pagination |
| `limit` | int | Max results |

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Implementing auth",
    "project_id": "uuid",
    "ai_provider": "anthropic",
    "ai_model": "claude-3-5-sonnet",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
]
```

### Create Chat

```http
POST /chat
```

**Request Body:**
```json
{
  "title": "New conversation",
  "project_id": "uuid",
  "ai_provider": "anthropic",
  "ai_model": "claude-3-5-sonnet"
}
```

**Response:** `201 Created`

### Get Chat with Messages

```http
GET /chat/{chat_id}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "title": "Implementing auth",
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "How do I add JWT auth?",
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Here's how to implement JWT authentication...",
      "tool_calls": [],
      "created_at": "2024-01-01T00:00:01Z"
    }
  ]
}
```

### Send Message (Streaming)

```http
POST /chat/{chat_id}/messages
```

**Request Body:**
```json
{
  "message": "How do I implement caching?",
  "stream": true,
  "use_tools": true
}
```

**Response:** `200 OK` (Server-Sent Events)
```
data: {"type": "content", "content": "To implement"}
data: {"type": "content", "content": " caching..."}
data: {"type": "tool_call", "name": "read_file", "args": {"path": "main.py"}}
data: {"type": "tool_result", "content": "..."}
data: [DONE]
```

### Delete Chat

```http
DELETE /chat/{chat_id}
```

**Response:** `204 No Content`

---

## AI Providers

### List Providers

```http
GET /ai/providers
```

**Response:** `200 OK`
```json
[
  {
    "name": "anthropic",
    "display_name": "Anthropic (Claude)",
    "available": true,
    "models": ["claude-3-5-sonnet", "claude-3-opus"]
  },
  {
    "name": "openai",
    "display_name": "OpenAI",
    "available": true,
    "models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"]
  },
  {
    "name": "lmstudio",
    "display_name": "LM Studio",
    "available": false,
    "models": []
  }
]
```

### Get Provider Models

```http
GET /ai/providers/{provider}/models
```

**Response:** `200 OK`
```json
[
  {
    "id": "claude-3-5-sonnet",
    "name": "Claude 3.5 Sonnet",
    "context_window": 200000,
    "max_output": 8192
  }
]
```

---

## Files

### Read File

```http
POST /files/read
```

**Request Body:**
```json
{
  "path": "src/main.py",
  "project_path": "/path/to/project"
}
```

**Response:** `200 OK`
```json
{
  "content": "import fastapi...",
  "size": 1024,
  "modified_at": "2024-01-01T00:00:00Z"
}
```

### Write File

```http
POST /files/write
```

**Request Body:**
```json
{
  "path": "src/main.py",
  "content": "import fastapi...",
  "project_path": "/path/to/project"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "path": "src/main.py"
}
```

### List Directory

```http
POST /files/list
```

**Request Body:**
```json
{
  "path": "src",
  "project_path": "/path/to/project",
  "recursive": false
}
```

**Response:** `200 OK`
```json
[
  {
    "name": "main.py",
    "path": "src/main.py",
    "is_directory": false,
    "size": 1024
  },
  {
    "name": "utils",
    "path": "src/utils",
    "is_directory": true
  }
]
```

---

## Google Drive

### Get Status

```http
GET /drive/status
```

**Response:** `200 OK`
```json
{
  "configured": true,
  "connected": true,
  "user_has_token": true
}
```

### Authorize

```http
GET /drive/authorize?redirect_uri=http://localhost:3000/drive
```

**Response:** `200 OK`
```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/auth?..."
}
```

### List Files

```http
GET /drive/files?folder_id=root
```

**Response:** `200 OK`
```json
[
  {
    "id": "file_id",
    "name": "document.pdf",
    "mime_type": "application/pdf",
    "size": 102400,
    "modified_time": "2024-01-01T00:00:00Z",
    "web_view_link": "https://drive.google.com/...",
    "is_folder": false
  }
]
```

### Search Files

```http
GET /drive/search?query=important
```

### Download File

```http
GET /drive/files/{file_id}/download
```

### Create Folder

```http
POST /drive/folders
```

**Request Body:**
```json
{
  "name": "New Folder",
  "parent_id": "root"
}
```

### Sync to Local

```http
POST /drive/sync/download
```

**Request Body:**
```json
{
  "folder_id": "drive_folder_id",
  "local_path": "/path/to/local"
}
```

---

## OAuth

### GitHub Login

```http
GET /oauth/github/login?redirect_uri=http://localhost:3000
```

**Response:** `302 Redirect` to GitHub

### GitHub Callback

```http
GET /oauth/github/callback?code=xxx&state=xxx
```

**Response:** `302 Redirect` with tokens

### Google Login

```http
GET /oauth/google/login?redirect_uri=http://localhost:3000
```

---

## Templates

### List Templates

```http
GET /templates
```

**Response:** `200 OK`
```json
[
  {
    "id": "fastapi-backend",
    "name": "FastAPI Backend",
    "description": "Python REST API with authentication",
    "category": "backend",
    "variables": ["project_name", "author"]
  }
]
```

### Get Template

```http
GET /templates/{template_id}
```

### Create Project from Template

```http
POST /templates/{template_id}/create
```

**Request Body:**
```json
{
  "output_path": "/path/to/new/project",
  "variables": {
    "project_name": "my-api",
    "author": "John Doe"
  }
}
```

---

## Plugins

### List Plugins

```http
GET /plugins
```

**Response:** `200 OK`
```json
[
  {
    "id": "code-review",
    "name": "Code Review",
    "version": "1.0.0",
    "enabled": true,
    "hooks": ["pre_commit", "post_save"]
  }
]
```

### Install Plugin

```http
POST /plugins/install
```

**Request Body:**
```json
{
  "source": "https://github.com/user/plugin.git"
}
```

### Enable/Disable Plugin

```http
PUT /plugins/{plugin_id}
```

**Request Body:**
```json
{
  "enabled": true
}
```

### Execute Plugin Hook

```http
POST /plugins/{plugin_id}/hooks/{hook_name}
```

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `BAD_REQUEST` | Invalid request body |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 422 | `VALIDATION_ERROR` | Request validation failed |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Rate Limiting

- **Default**: 100 requests per minute
- **Chat messages**: 20 per minute
- **File operations**: 50 per minute

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

---

## WebSocket Endpoints

### Chat Stream

```
ws://localhost:8000/ws/chat/{chat_id}
```

**Client Message:**
```json
{
  "type": "message",
  "content": "Hello",
  "use_tools": true
}
```

**Server Messages:**
```json
{"type": "content", "content": "Hello! How..."}
{"type": "tool_call", "name": "search", "args": {...}}
{"type": "tool_result", "content": "..."}
{"type": "done"}
```

---

## OpenAPI Documentation

Interactive API documentation is available at:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`
