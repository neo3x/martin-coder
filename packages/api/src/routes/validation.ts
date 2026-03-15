import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import { detectValidationTools, runValidationPipeline } from '../services/validation.js'
import { db } from '../db/index.js'
import { projects } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import type { User } from '../db/schema.js'

type Variables = { user: User }
const validationRoutes = new Hono<{ Variables: Variables }>()
validationRoutes.use('*', authMiddleware)

// Detect what validation tools are available for a project
validationRoutes.get('/detect', async (c) => {
  const projectId = c.req.query('projectId')

  if (!projectId) {
    return c.json({ error: 'projectId query param required' }, 400)
  }

  try {
    const project = await db.select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get()

    if (!project?.localPath) {
      return c.json({ error: 'Project not found or has no local path' }, 404)
    }

    const tools = detectValidationTools(project.localPath)
    return c.json({ projectPath: project.localPath, tools })
  } catch (err) {
    return c.json({ error: 'Failed to detect validation tools', details: String(err) }, 500)
  }
})

// Run validation pipeline for a project
validationRoutes.post('/run', zValidator('json', z.object({
  projectId: z.string(),
  toolTypes: z.array(z.enum(['lint', 'typecheck', 'test', 'build'])).optional(),
})), async (c) => {
  const user = c.get('user')
  const { projectId, toolTypes } = c.req.valid('json')

  try {
    const project = await db.select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get()

    if (!project?.localPath) {
      return c.json({ error: 'Project not found or has no local path' }, 404)
    }

    const allTools = detectValidationTools(project.localPath)
    const tools = toolTypes
      ? allTools.filter(t => toolTypes.includes(t.type as 'lint' | 'typecheck' | 'test' | 'build'))
      : allTools

    const report = await runValidationPipeline(project.localPath, tools)

    return c.json({ report })
  } catch (err) {
    return c.json({ error: 'Failed to run validation', details: String(err) }, 500)
  }
})

export { validationRoutes }
