import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import { resolve } from 'path'
import {
  readFileTool,
  writeFileTool,
  editFileTool,
  listDirectoryTool,
  searchFilesTool,
} from '../tools/index.js'
import type { User } from '../db/schema.js'

type Variables = {
  user: User
}

const filesRoutes = new Hono<{ Variables: Variables }>()
filesRoutes.use('*', authMiddleware)

const readFileSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  lineStart: z.number().optional(),
  lineEnd: z.number().optional(),
})

const writeFileSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  content: z.string(),
})

const editFileSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  oldStr: z.string().min(1, 'oldStr is required'),
  newStr: z.string(),
})

const listDirectorySchema = z.object({
  path: z.string().min(1, 'Path is required'),
  recursive: z.boolean().optional(),
  pattern: z.string().optional(),
})

const searchFilesSchema = z.object({
  pattern: z.string().min(1, 'Pattern is required'),
  directory: z.string().optional(),
  fileTypes: z.array(z.string()).optional(),
})

const execSchema = z.object({
  command: z.string().min(1, 'Command is required'),
  cwd: z.string().optional(),
  timeoutMs: z.number().int().min(1000).max(120000).optional(),
})

filesRoutes.post('/read', zValidator('json', readFileSchema), async (c) => {
  const params = c.req.valid('json')

  try {
    const result = await readFileTool.execute!(params, { toolCallId: 'direct', messages: [] })
    if ('error' in result) {
      return c.json({ error: result.error }, 400)
    }
    return c.json(result)
  } catch (err) {
    return c.json({ error: 'Failed to read file', details: String(err) }, 500)
  }
})

filesRoutes.post('/write', zValidator('json', writeFileSchema), async (c) => {
  const params = c.req.valid('json')

  try {
    const result = await writeFileTool.execute!(params, { toolCallId: 'direct', messages: [] })
    if ('error' in result) {
      return c.json({ error: result.error }, 400)
    }
    return c.json(result)
  } catch (err) {
    return c.json({ error: 'Failed to write file', details: String(err) }, 500)
  }
})

filesRoutes.post('/edit', zValidator('json', editFileSchema), async (c) => {
  const params = c.req.valid('json')

  try {
    const result = await editFileTool.execute!(params, { toolCallId: 'direct', messages: [] })
    if ('error' in result) {
      return c.json({ error: result.error }, 400)
    }
    return c.json(result)
  } catch (err) {
    return c.json({ error: 'Failed to edit file', details: String(err) }, 500)
  }
})

filesRoutes.post('/list', zValidator('json', listDirectorySchema), async (c) => {
  const params = c.req.valid('json')

  try {
    const result = await listDirectoryTool.execute!(params, { toolCallId: 'direct', messages: [] })
    if ('error' in result) {
      return c.json({ error: result.error }, 400)
    }
    return c.json(result)
  } catch (err) {
    return c.json({ error: 'Failed to list directory', details: String(err) }, 500)
  }
})

filesRoutes.post('/search', zValidator('json', searchFilesSchema), async (c) => {
  const params = c.req.valid('json')

  try {
    const result = await searchFilesTool.execute!(params, { toolCallId: 'direct', messages: [] })
    if ('error' in result) {
      return c.json({ error: result.error }, 400)
    }
    return c.json(result)
  } catch (err) {
    return c.json({ error: 'Failed to search files', details: String(err) }, 500)
  }
})

filesRoutes.post('/exec', zValidator('json', execSchema), async (c) => {
  const { command, cwd, timeoutMs } = c.req.valid('json')

  try {
    const workspaceRoot = process.env.WORKSPACE_ROOT || '/workspace'
    const effectiveCwd = resolve(cwd || workspaceRoot)
    const resolvedWorkspaceRoot = resolve(workspaceRoot)

    if (!effectiveCwd.startsWith(resolvedWorkspaceRoot)) {
      return c.json({ error: 'cwd must be inside WORKSPACE_ROOT' }, 400)
    }

    const proc = Bun.spawn(['sh', '-lc', command], {
      cwd: effectiveCwd,
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const timeout = timeoutMs || 30000
    const result = await Promise.race([
      (async () => {
        const [stdoutBuf, stderrBuf, exitCode] = await Promise.all([
          new Response(proc.stdout).arrayBuffer(),
          new Response(proc.stderr).arrayBuffer(),
          proc.exited,
        ])
        return {
          ok: exitCode === 0,
          exitCode,
          stdout: new TextDecoder().decode(stdoutBuf),
          stderr: new TextDecoder().decode(stderrBuf),
        }
      })(),
      (async () => {
        await new Promise((r) => setTimeout(r, timeout))
        proc.kill('SIGKILL')
        return {
          ok: false,
          exitCode: -1,
          stdout: '',
          stderr: `Command timed out after ${timeout}ms`,
        }
      })(),
    ])

    return c.json(result)
  } catch (err) {
    return c.json({ error: 'Failed to execute command', details: String(err) }, 500)
  }
})

export { filesRoutes }
