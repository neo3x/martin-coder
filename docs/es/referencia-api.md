# Referencia de API

Documentación completa de la API para los servicios backend de Martin-Coder.

## URL Base

```
http://localhost:8000/api/v1
```

## Autenticación

La mayoría de los endpoints requieren autenticación mediante token Bearer.

```http
Authorization: Bearer <access_token>
```

---

## Endpoints de Autenticación

### Registrar Usuario

```http
POST /auth/register
```

**Cuerpo de la Solicitud:**
```json
{
  "email": "usuario@ejemplo.com",
  "username": "juanperez",
  "password": "contraseñasegura123"
}
```

**Respuesta:** `201 Created`
```json
{
  "id": "uuid",
  "email": "usuario@ejemplo.com",
  "username": "juanperez",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Iniciar Sesión

```http
POST /auth/login
```

**Cuerpo de la Solicitud:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseñasegura123"
}
```

**Respuesta:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### Refrescar Token

```http
POST /auth/refresh
```

**Cuerpo de la Solicitud:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Respuesta:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### Obtener Usuario Actual

```http
GET /auth/me
```

**Respuesta:** `200 OK`
```json
{
  "id": "uuid",
  "email": "usuario@ejemplo.com",
  "username": "juanperez",
  "is_active": true,
  "preferences": {},
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## Proyectos

### Listar Proyectos

```http
GET /projects
```

**Parámetros de Consulta:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `skip` | int | Offset para paginación (default: 0) |
| `limit` | int | Máximo de resultados (default: 100) |

**Respuesta:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "mi-proyecto",
    "description": "Un proyecto de ejemplo",
    "local_path": "/ruta/al/proyecto",
    "git_url": "https://github.com/usuario/repo",
    "is_indexed": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### Crear Proyecto

```http
POST /projects
```

**Cuerpo de la Solicitud:**
```json
{
  "name": "mi-proyecto",
  "description": "Un proyecto de ejemplo",
  "local_path": "/ruta/al/proyecto",
  "git_url": "https://github.com/usuario/repo"
}
```

**Respuesta:** `201 Created`

### Obtener Proyecto

```http
GET /projects/{project_id}
```

**Respuesta:** `200 OK`

### Actualizar Proyecto

```http
PUT /projects/{project_id}
```

### Eliminar Proyecto

```http
DELETE /projects/{project_id}
```

**Respuesta:** `204 No Content`

### Analizar Proyecto

```http
POST /projects/{project_id}/analyze
```

Analiza la estructura del proyecto, dependencias y crea metadatos.

**Respuesta:** `200 OK`
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

### Indexar Proyecto

```http
POST /projects/{project_id}/index
```

Crea o actualiza el índice RAG para búsqueda semántica.

**Respuesta:** `200 OK`
```json
{
  "indexed_files": 150,
  "chunks_created": 1200,
  "index_size_mb": 25.5
}
```

---

## Chat

### Listar Chats

```http
GET /chat
```

**Parámetros de Consulta:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `project_id` | uuid | Filtrar por proyecto |
| `skip` | int | Offset para paginación |
| `limit` | int | Máximo de resultados |

**Respuesta:** `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Implementando auth",
    "project_id": "uuid",
    "ai_provider": "anthropic",
    "ai_model": "claude-3-5-sonnet",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
]
```

### Crear Chat

```http
POST /chat
```

**Cuerpo de la Solicitud:**
```json
{
  "title": "Nueva conversación",
  "project_id": "uuid",
  "ai_provider": "anthropic",
  "ai_model": "claude-3-5-sonnet"
}
```

**Respuesta:** `201 Created`

### Obtener Chat con Mensajes

```http
GET /chat/{chat_id}
```

**Respuesta:** `200 OK`
```json
{
  "id": "uuid",
  "title": "Implementando auth",
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "¿Cómo agrego autenticación JWT?",
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Así es como implementar autenticación JWT...",
      "tool_calls": [],
      "created_at": "2024-01-01T00:00:01Z"
    }
  ]
}
```

### Enviar Mensaje (Streaming)

```http
POST /chat/{chat_id}/messages
```

**Cuerpo de la Solicitud:**
```json
{
  "message": "¿Cómo implemento caché?",
  "stream": true,
  "use_tools": true
}
```

**Respuesta:** `200 OK` (Server-Sent Events)
```
data: {"type": "content", "content": "Para implementar"}
data: {"type": "content", "content": " caché..."}
data: {"type": "tool_call", "name": "read_file", "args": {"path": "main.py"}}
data: {"type": "tool_result", "content": "..."}
data: [DONE]
```

### Eliminar Chat

```http
DELETE /chat/{chat_id}
```

**Respuesta:** `204 No Content`

---

## Proveedores de IA

### Listar Proveedores

```http
GET /ai/providers
```

**Respuesta:** `200 OK`
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

### Obtener Modelos del Proveedor

```http
GET /ai/providers/{provider}/models
```

**Respuesta:** `200 OK`
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

## Archivos

### Leer Archivo

```http
POST /files/read
```

**Cuerpo de la Solicitud:**
```json
{
  "path": "src/main.py",
  "project_path": "/ruta/al/proyecto"
}
```

**Respuesta:** `200 OK`
```json
{
  "content": "import fastapi...",
  "size": 1024,
  "modified_at": "2024-01-01T00:00:00Z"
}
```

### Escribir Archivo

```http
POST /files/write
```

**Cuerpo de la Solicitud:**
```json
{
  "path": "src/main.py",
  "content": "import fastapi...",
  "project_path": "/ruta/al/proyecto"
}
```

**Respuesta:** `200 OK`
```json
{
  "success": true,
  "path": "src/main.py"
}
```

### Listar Directorio

```http
POST /files/list
```

**Cuerpo de la Solicitud:**
```json
{
  "path": "src",
  "project_path": "/ruta/al/proyecto",
  "recursive": false
}
```

**Respuesta:** `200 OK`
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

### Obtener Estado

```http
GET /drive/status
```

**Respuesta:** `200 OK`
```json
{
  "configured": true,
  "connected": true,
  "user_has_token": true
}
```

### Autorizar

```http
GET /drive/authorize?redirect_uri=http://localhost:3005/drive
```

**Respuesta:** `200 OK`
```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/auth?..."
}
```

### Listar Archivos

```http
GET /drive/files?folder_id=root
```

**Respuesta:** `200 OK`
```json
[
  {
    "id": "file_id",
    "name": "documento.pdf",
    "mime_type": "application/pdf",
    "size": 102400,
    "modified_time": "2024-01-01T00:00:00Z",
    "web_view_link": "https://drive.google.com/...",
    "is_folder": false
  }
]
```

### Buscar Archivos

```http
GET /drive/search?query=importante
```

### Descargar Archivo

```http
GET /drive/files/{file_id}/download
```

### Crear Carpeta

```http
POST /drive/folders
```

**Cuerpo de la Solicitud:**
```json
{
  "name": "Nueva Carpeta",
  "parent_id": "root"
}
```

### Sincronizar a Local

```http
POST /drive/sync/download
```

**Cuerpo de la Solicitud:**
```json
{
  "folder_id": "id_carpeta_drive",
  "local_path": "/ruta/local"
}
```

---

## OAuth

### Login con GitHub

```http
GET /oauth/github/login?redirect_uri=http://localhost:3005
```

**Respuesta:** `302 Redirect` a GitHub

### Callback de GitHub

```http
GET /oauth/github/callback?code=xxx&state=xxx
```

**Respuesta:** `302 Redirect` con tokens

### Login con Google

```http
GET /oauth/google/login?redirect_uri=http://localhost:3005
```

---

## Plantillas

### Listar Plantillas

```http
GET /templates
```

**Respuesta:** `200 OK`
```json
[
  {
    "id": "fastapi-backend",
    "name": "FastAPI Backend",
    "description": "API REST Python con autenticación",
    "category": "backend",
    "variables": ["project_name", "author"]
  }
]
```

### Obtener Plantilla

```http
GET /templates/{template_id}
```

### Crear Proyecto desde Plantilla

```http
POST /templates/{template_id}/create
```

**Cuerpo de la Solicitud:**
```json
{
  "output_path": "/ruta/al/nuevo/proyecto",
  "variables": {
    "project_name": "mi-api",
    "author": "Juan Pérez"
  }
}
```

---

## Plugins

### Listar Plugins

```http
GET /plugins
```

**Respuesta:** `200 OK`
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

### Instalar Plugin

```http
POST /plugins/install
```

**Cuerpo de la Solicitud:**
```json
{
  "source": "https://github.com/usuario/plugin.git"
}
```

### Habilitar/Deshabilitar Plugin

```http
PUT /plugins/{plugin_id}
```

**Cuerpo de la Solicitud:**
```json
{
  "enabled": true
}
```

### Ejecutar Hook de Plugin

```http
POST /plugins/{plugin_id}/hooks/{hook_name}
```

---

## Respuestas de Error

Todos los errores siguen este formato:

```json
{
  "detail": "Mensaje de error",
  "code": "CODIGO_ERROR"
}
```

### Códigos de Error Comunes

| Estado | Código | Descripción |
|--------|--------|-------------|
| 400 | `BAD_REQUEST` | Cuerpo de solicitud inválido |
| 401 | `UNAUTHORIZED` | Token faltante o inválido |
| 403 | `FORBIDDEN` | Permisos insuficientes |
| 404 | `NOT_FOUND` | Recurso no encontrado |
| 409 | `CONFLICT` | Recurso ya existe |
| 422 | `VALIDATION_ERROR` | Validación de solicitud falló |
| 429 | `RATE_LIMITED` | Demasiadas solicitudes |
| 500 | `INTERNAL_ERROR` | Error del servidor |

---

## Límites de Tasa

- **Default**: 100 solicitudes por minuto
- **Mensajes de chat**: 20 por minuto
- **Operaciones de archivo**: 50 por minuto

Headers de límite de tasa:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

---

## Endpoints WebSocket

### Stream de Chat

```
ws://localhost:8000/ws/chat/{chat_id}
```

**Mensaje del Cliente:**
```json
{
  "type": "message",
  "content": "Hola",
  "use_tools": true
}
```

**Mensajes del Servidor:**
```json
{"type": "content", "content": "¡Hola! ¿Cómo..."}
{"type": "tool_call", "name": "search", "args": {...}}
{"type": "tool_result", "content": "..."}
{"type": "done"}
```

---

## Documentación OpenAPI

La documentación interactiva de API está disponible en:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`
