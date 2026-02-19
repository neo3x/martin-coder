import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { listProviders, getModelsForProvider } from '../providers/index.js'
import { listAgents } from '../agents/index.js'
import type { User } from '../db/schema.js'

type Variables = {
  user: User
}

const aiRoutes = new Hono<{ Variables: Variables }>()
aiRoutes.use('*', authMiddleware)

aiRoutes.get('/providers', async (c) => {
  try {
    const providers = listProviders()
    return c.json({ providers })
  } catch (err) {
    return c.json({ error: 'Failed to list providers', details: String(err) }, 500)
  }
})

aiRoutes.get('/providers/:name/models', async (c) => {
  const { name } = c.req.param()

  try {
    const models = getModelsForProvider(name)

    if (models.length === 0) {
      return c.json({ error: `Provider not found: ${name}` }, 404)
    }

    return c.json({ provider: name, models })
  } catch (err) {
    return c.json({ error: 'Failed to get models', details: String(err) }, 500)
  }
})

aiRoutes.get('/health', async (c) => {
  const user = c.get('user')
  const providers = listProviders()

  const healthChecks = await Promise.all(
    providers.map(async (provider) => {
      let status: 'available' | 'unavailable' | 'no_key' = 'unavailable'
      let error: string | undefined

      // Check if user has API key for this provider
      const userKeyMap: Record<string, string | null | undefined> = {
        anthropic: user.anthropicApiKey,
        openai: user.openaiApiKey,
        google: user.googleApiKey,
        ollama: 'not-required',
      }

      const envKeyMap: Record<string, string | undefined> = {
        anthropic: process.env.ANTHROPIC_API_KEY,
        openai: process.env.OPENAI_API_KEY,
        google: process.env.GOOGLE_API_KEY,
        ollama: 'not-required',
      }

      const hasKey = userKeyMap[provider.name] || envKeyMap[provider.name]

      if (!hasKey && provider.requiresApiKey) {
        status = 'no_key'
      } else if (provider.name === 'ollama') {
        // Try to ping Ollama
        try {
          const ollamaBase = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
          const response = await fetch(`${ollamaBase}/api/tags`, {
            signal: AbortSignal.timeout(2000),
          })
          status = response.ok ? 'available' : 'unavailable'
        } catch {
          status = 'unavailable'
          error = 'Ollama not running'
        }
      } else {
        status = 'available'
      }

      return {
        name: provider.name,
        displayName: provider.displayName,
        status,
        error,
        modelCount: provider.models.length,
      }
    })
  )

  return c.json({ providers: healthChecks })
})

aiRoutes.get('/agents', async (c) => {
  try {
    const agents = listAgents()
    return c.json({ agents })
  } catch (err) {
    return c.json({ error: 'Failed to list agents', details: String(err) }, 500)
  }
})

export { aiRoutes }
