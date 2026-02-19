import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import { lspManager } from '../lsp/index.js'
import type { User } from '../db/schema.js'

type Variables = {
  user: User
}

const lspRoutes = new Hono<{ Variables: Variables }>()
lspRoutes.use('*', authMiddleware)

const startServerSchema = z.object({
  language: z.string().min(1, 'Language is required'),
  workspacePath: z.string().min(1, 'Workspace path is required'),
})

const stopServerSchema = z.object({
  language: z.string().min(1, 'Language is required'),
  workspacePath: z.string().optional(),
})

const diagnosticsSchema = z.object({
  language: z.string().min(1),
  filePath: z.string().min(1),
  content: z.string(),
})

const completionsSchema = z.object({
  language: z.string().min(1),
  filePath: z.string().min(1),
  content: z.string(),
  line: z.number().int().min(0),
  character: z.number().int().min(0),
})

const hoverSchema = z.object({
  language: z.string().min(1),
  filePath: z.string().min(1),
  content: z.string(),
  line: z.number().int().min(0),
  character: z.number().int().min(0),
})

lspRoutes.post('/start', zValidator('json', startServerSchema), async (c) => {
  const { language, workspacePath } = c.req.valid('json')

  try {
    await lspManager.startServer(language, workspacePath)
    return c.json({ message: `LSP server started for ${language}`, language, workspacePath })
  } catch (err) {
    return c.json({ error: 'Failed to start LSP server', details: String(err) }, 500)
  }
})

lspRoutes.post('/stop', zValidator('json', stopServerSchema), async (c) => {
  const { language, workspacePath } = c.req.valid('json')

  try {
    await lspManager.stopServer(language, workspacePath)
    return c.json({ message: `LSP server stopped for ${language}` })
  } catch (err) {
    return c.json({ error: 'Failed to stop LSP server', details: String(err) }, 500)
  }
})

lspRoutes.post('/diagnostics', zValidator('json', diagnosticsSchema), async (c) => {
  const { language, filePath, content } = c.req.valid('json')

  try {
    const diagnostics = await lspManager.getDiagnostics(language, filePath, content)
    return c.json({ diagnostics, count: diagnostics.length })
  } catch (err) {
    return c.json({ error: 'Failed to get diagnostics', details: String(err) }, 500)
  }
})

lspRoutes.post('/completions', zValidator('json', completionsSchema), async (c) => {
  const { language, filePath, content, line, character } = c.req.valid('json')

  try {
    const completions = await lspManager.getCompletion(language, filePath, content, line, character)
    return c.json({ completions, count: completions.length })
  } catch (err) {
    return c.json({ error: 'Failed to get completions', details: String(err) }, 500)
  }
})

lspRoutes.post('/hover', zValidator('json', hoverSchema), async (c) => {
  const { language, filePath, content, line, character } = c.req.valid('json')

  try {
    const hover = await lspManager.getHover(language, filePath, content, line, character)
    if (!hover) {
      return c.json({ hover: null })
    }
    return c.json({ hover })
  } catch (err) {
    return c.json({ error: 'Failed to get hover info', details: String(err) }, 500)
  }
})

lspRoutes.get('/servers', async (c) => {
  try {
    const servers = lspManager.listServers()
    const supported = lspManager.getSupportedLanguages()
    return c.json({ servers, supportedLanguages: supported })
  } catch (err) {
    return c.json({ error: 'Failed to list servers', details: String(err) }, 500)
  }
})

export { lspRoutes }
