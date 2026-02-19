import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { HTTPException } from 'hono/http-exception'

import { runMigrations } from './db/index.js'
import { authRoutes } from './routes/auth.js'
import { sessionsRoutes } from './routes/sessions.js'
import { projectsRoutes } from './routes/projects.js'
import { aiRoutes } from './routes/ai.js'
import { filesRoutes } from './routes/files.js'
import { lspRoutes } from './routes/lsp.js'
import { mcpRoutes } from './routes/mcp.js'
import { pluginsRoutes } from './routes/plugins.js'
import { usersRoutes } from './routes/users.js'

// Run database migrations on startup
runMigrations()

const app = new Hono()

// Global middleware
app.use('*', cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  credentials: true,
}))

app.use('*', logger())
app.use('*', prettyJSON())

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// OpenAPI spec
app.get('/openapi.json', (c) => {
  return c.json({
    openapi: '3.0.0',
    info: {
      title: 'Martin Coder API',
      version: '2.0.0',
      description: 'AI Coding Agent Platform API',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 8000}`,
        description: 'Development server',
      },
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Health check',
          responses: { '200': { description: 'OK' } },
        },
      },
      '/api/v1/auth/register': {
        post: {
          summary: 'Register a new user',
          tags: ['auth'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'username', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    username: { type: 'string', minLength: 3 },
                    password: { type: 'string', minLength: 8 },
                    fullName: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'User created' } },
        },
      },
      '/api/v1/auth/login': {
        post: {
          summary: 'Login',
          tags: ['auth'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Login successful' } },
        },
      },
      '/api/v1/sessions': {
        get: {
          summary: 'List sessions',
          tags: ['sessions'],
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Sessions list' } },
        },
        post: {
          summary: 'Create session',
          tags: ['sessions'],
          security: [{ bearerAuth: [] }],
          responses: { '201': { description: 'Session created' } },
        },
      },
      '/api/v1/sessions/{id}/messages': {
        post: {
          summary: 'Send message (supports SSE streaming with Accept: text/event-stream)',
          tags: ['sessions'],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Message sent' } },
        },
      },
      '/api/v1/projects': {
        get: { summary: 'List projects', tags: ['projects'], security: [{ bearerAuth: [] }] },
        post: { summary: 'Create project', tags: ['projects'], security: [{ bearerAuth: [] }] },
      },
      '/api/v1/ai/providers': {
        get: { summary: 'List AI providers', tags: ['ai'], security: [{ bearerAuth: [] }] },
      },
      '/api/v1/ai/agents': {
        get: { summary: 'List agents', tags: ['ai'], security: [{ bearerAuth: [] }] },
      },
      '/api/v1/files/read': {
        post: { summary: 'Read a file', tags: ['files'], security: [{ bearerAuth: [] }] },
      },
      '/api/v1/files/write': {
        post: { summary: 'Write a file', tags: ['files'], security: [{ bearerAuth: [] }] },
      },
      '/api/v1/lsp/start': {
        post: { summary: 'Start LSP server', tags: ['lsp'], security: [{ bearerAuth: [] }] },
      },
      '/api/v1/mcp/servers': {
        get: { summary: 'List MCP servers', tags: ['mcp'], security: [{ bearerAuth: [] }] },
        post: { summary: 'Add MCP server', tags: ['mcp'], security: [{ bearerAuth: [] }] },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  })
})

// Mount API routes at /api/v1
const api = new Hono()
api.route('/auth', authRoutes)
api.route('/sessions', sessionsRoutes)
api.route('/projects', projectsRoutes)
api.route('/ai', aiRoutes)
api.route('/files', filesRoutes)
api.route('/lsp', lspRoutes)
api.route('/mcp', mcpRoutes)
api.route('/plugins', pluginsRoutes)
api.route('/users', usersRoutes)

app.route('/api/v1', api)

// Global error handler
app.onError((err, c) => {
  console.error('[Error]', err)

  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }

  return c.json(
    {
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(err) : undefined,
    },
    500
  )
})

// 404 handler
app.notFound((c) => {
  return c.json({ error: `Route not found: ${c.req.path}` }, 404)
})

const port = parseInt(String(process.env.PORT || '8000'), 10)
console.log(`[Server] Martin Coder API starting on port ${port}`)
console.log(`[Server] Health check: http://localhost:${port}/health`)
console.log(`[Server] API docs: http://localhost:${port}/openapi.json`)

export default {
  port,
  fetch: app.fetch,
}
