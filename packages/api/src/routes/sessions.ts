import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import {
  createSession,
  getSession,
  listSessions,
  updateSession,
  deleteSession,
  getMessages,
  addMessage,
} from '../services/session.js'
import { streamMessage } from '../services/chat.js'
import type { User } from '../db/schema.js'
import { streamSSE } from 'hono/streaming'

type Variables = {
  user: User
}

const sessionsRoutes = new Hono<{ Variables: Variables }>()
sessionsRoutes.use('*', authMiddleware)

const createSessionSchema = z.object({
  title: z.string().optional(),
  projectId: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  contextFiles: z.array(z.string()).optional(),
})

const updateSessionSchema = z.object({
  title: z.string().optional(),
  systemPrompt: z.string().optional(),
  contextFiles: z.array(z.string()).optional(),
})

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty'),
  agent: z.string().optional(),
})

sessionsRoutes.get('/', async (c) => {
  const user = c.get('user')
  try {
    const userSessions = await listSessions(user.id)
    return c.json({ sessions: userSessions })
  } catch (err) {
    return c.json({ error: 'Failed to list sessions', details: String(err) }, 500)
  }
})

sessionsRoutes.post('/', zValidator('json', createSessionSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')

  try {
    const session = await createSession(user.id, {
      ...data,
      provider: data.provider || user.defaultProvider,
      model: data.model || user.defaultModel,
      contextFiles: data.contextFiles ? JSON.stringify(data.contextFiles) : '[]',
    })

    return c.json({ session }, 201)
  } catch (err) {
    return c.json({ error: 'Failed to create session', details: String(err) }, 500)
  }
})

sessionsRoutes.get('/:id', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  try {
    const session = await getSession(id)

    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }

    if (session.userId !== user.id && !user.isSuperuser) {
      return c.json({ error: 'Access denied' }, 403)
    }

    return c.json({ session })
  } catch (err) {
    return c.json({ error: 'Failed to get session', details: String(err) }, 500)
  }
})

sessionsRoutes.patch('/:id', zValidator('json', updateSessionSchema), async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()
  const data = c.req.valid('json')

  try {
    const session = await getSession(id)

    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }

    if (session.userId !== user.id && !user.isSuperuser) {
      return c.json({ error: 'Access denied' }, 403)
    }

    const updated = await updateSession(id, {
      ...data,
      contextFiles: data.contextFiles ? JSON.stringify(data.contextFiles) : undefined,
    })

    return c.json({ session: updated })
  } catch (err) {
    return c.json({ error: 'Failed to update session', details: String(err) }, 500)
  }
})

sessionsRoutes.delete('/:id', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  try {
    const session = await getSession(id)

    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }

    if (session.userId !== user.id && !user.isSuperuser) {
      return c.json({ error: 'Access denied' }, 403)
    }

    await deleteSession(id)
    return c.json({ message: 'Session deleted' })
  } catch (err) {
    return c.json({ error: 'Failed to delete session', details: String(err) }, 500)
  }
})

// Send a message with SSE streaming
sessionsRoutes.post('/:id/messages', zValidator('json', sendMessageSchema), async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()
  const { content, agent } = c.req.valid('json')

  const session = await getSession(id)

  if (!session) {
    return c.json({ error: 'Session not found' }, 404)
  }

  if (session.userId !== user.id && !user.isSuperuser) {
    return c.json({ error: 'Access denied' }, 403)
  }

  // Determine if streaming is requested
  const acceptHeader = c.req.header('Accept') || ''
  const useStreaming = acceptHeader.includes('text/event-stream')

  // Get user's API key for the provider
  const providerKeyMap: Record<string, string | null | undefined> = {
    anthropic: user.anthropicApiKey,
    openai: user.openaiApiKey,
    google: user.googleApiKey,
  }
  const userApiKey = providerKeyMap[session.provider] || undefined

  if (useStreaming) {
    return streamSSE(c, async (sseStream) => {
      try {
        await streamMessage(
          id,
          content,
          agent,
          async (chunk) => {
            await sseStream.writeSSE({
              data: JSON.stringify(chunk),
              event: chunk.type,
            })
          },
          userApiKey
        )

        await sseStream.writeSSE({ data: '[DONE]', event: 'done' })
      } catch (err) {
        await sseStream.writeSSE({
          data: JSON.stringify({ error: String(err) }),
          event: 'error',
        })
      }
    })
  }

  // Non-streaming fallback
  try {
    const result = await streamMessage(id, content, agent, undefined, userApiKey)
    return c.json({
      message: {
        role: 'assistant',
        content: result.assistantMessage,
      },
      usage: result.usage,
    })
  } catch (err) {
    return c.json({ error: 'Failed to send message', details: String(err) }, 500)
  }
})

sessionsRoutes.get('/:id/messages', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  try {
    const session = await getSession(id)

    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }

    if (session.userId !== user.id && !user.isSuperuser) {
      return c.json({ error: 'Access denied' }, 403)
    }

    const msgs = await getMessages(id)
    return c.json({ messages: msgs })
  } catch (err) {
    return c.json({ error: 'Failed to list messages', details: String(err) }, 500)
  }
})

export { sessionsRoutes }
