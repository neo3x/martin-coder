import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import { mcpManager } from '../mcp/index.js'
import type { User } from '../db/schema.js'

type Variables = {
  user: User
}

const mcpRoutes = new Hono<{ Variables: Variables }>()
mcpRoutes.use('*', authMiddleware)

const addServerSchema = z.object({
  name: z.string().min(1, 'Server name is required'),
  command: z.string().min(1, 'Command is required'),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).optional(),
})

const callToolSchema = z.object({
  args: z.record(z.unknown()).default({}),
})

mcpRoutes.get('/servers', async (c) => {
  try {
    const servers = mcpManager.listServers()
    return c.json({ servers })
  } catch (err) {
    return c.json({ error: 'Failed to list MCP servers', details: String(err) }, 500)
  }
})

mcpRoutes.post('/servers', zValidator('json', addServerSchema), async (c) => {
  const { name, command, args, env } = c.req.valid('json')

  try {
    await mcpManager.addServer(name, command, args, env)
    return c.json({ message: `MCP server ${name} added successfully` }, 201)
  } catch (err) {
    return c.json({ error: 'Failed to add MCP server', details: String(err) }, 500)
  }
})

mcpRoutes.delete('/servers/:name', async (c) => {
  const { name } = c.req.param()

  try {
    await mcpManager.removeServer(name)
    return c.json({ message: `MCP server ${name} removed` })
  } catch (err) {
    return c.json({ error: 'Failed to remove MCP server', details: String(err) }, 500)
  }
})

mcpRoutes.get('/tools', async (c) => {
  const serverName = c.req.query('server')

  try {
    const tools = await mcpManager.listTools(serverName)
    return c.json({ tools, count: tools.length })
  } catch (err) {
    return c.json({ error: 'Failed to list MCP tools', details: String(err) }, 500)
  }
})

mcpRoutes.post('/tools/:server/:tool', zValidator('json', callToolSchema), async (c) => {
  const { server, tool } = c.req.param()
  const { args } = c.req.valid('json')

  try {
    const result = await mcpManager.callTool(server, tool, args)
    return c.json({ result })
  } catch (err) {
    return c.json({ error: 'Failed to call MCP tool', details: String(err) }, 500)
  }
})

export { mcpRoutes }
