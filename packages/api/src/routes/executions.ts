import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import {
  getExecution,
  listExecutions,
  rollbackExecution,
} from '../services/execution.js'
import { getSession } from '../services/session.js'
import { db } from '../db/index.js'
import { executions } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import type { User } from '../db/schema.js'

type Variables = { user: User }
const executionsRoutes = new Hono<{ Variables: Variables }>()
executionsRoutes.use('*', authMiddleware)

// List executions for a session
executionsRoutes.get('/', async (c) => {
  const user = c.get('user')
  const sessionId = c.req.query('sessionId')

  if (!sessionId) {
    return c.json({ error: 'sessionId query param required' }, 400)
  }

  try {
    const session = await getSession(sessionId)
    if (!session) return c.json({ error: 'Session not found' }, 404)
    if (session.userId !== user.id && !user.isSuperuser) return c.json({ error: 'Access denied' }, 403)

    const execs = await listExecutions(sessionId)
    return c.json({ executions: execs })
  } catch (err) {
    return c.json({ error: 'Failed to list executions', details: String(err) }, 500)
  }
})

// Get a single execution with all details
executionsRoutes.get('/:id', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  try {
    const execution = await getExecution(id)
    if (!execution) return c.json({ error: 'Execution not found' }, 404)

    // Verify ownership
    if (execution.userId !== user.id && !user.isSuperuser) {
      return c.json({ error: 'Access denied' }, 403)
    }

    return c.json({ execution })
  } catch (err) {
    return c.json({ error: 'Failed to get execution', details: String(err) }, 500)
  }
})

// Rollback an execution
executionsRoutes.post('/:id/rollback', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  try {
    const execution = await db.select()
      .from(executions)
      .where(eq(executions.id, id))
      .get()

    if (!execution) return c.json({ error: 'Execution not found' }, 404)

    if (execution.userId !== user.id && !user.isSuperuser) {
      return c.json({ error: 'Access denied' }, 403)
    }

    if (execution.phase === 'rolled_back') {
      return c.json({ error: 'Execution already rolled back' }, 400)
    }

    const result = await rollbackExecution(id)

    return c.json({
      success: true,
      executionId: id,
      filesRestored: result.filesRestored,
      errors: result.errors,
    })
  } catch (err) {
    return c.json({ error: 'Failed to rollback execution', details: String(err) }, 500)
  }
})

export { executionsRoutes }
