import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import { db } from '../db/index.js'
import { plugins } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import type { User } from '../db/schema.js'

type Variables = {
  user: User
}

const pluginsRoutes = new Hono<{ Variables: Variables }>()
pluginsRoutes.use('*', authMiddleware)

const installPluginSchema = z.object({
  name: z.string().min(1, 'Plugin name is required'),
  version: z.string().default('1.0.0'),
  config: z.record(z.unknown()).optional(),
})

const updatePluginSchema = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
})

pluginsRoutes.get('/', async (c) => {
  const user = c.get('user')

  try {
    const userPlugins = await db
      .select()
      .from(plugins)
      .where(eq(plugins.userId, user.id))
      .all()

    return c.json({
      plugins: userPlugins.map((p) => ({
        ...p,
        config: JSON.parse(p.config || '{}'),
      })),
    })
  } catch (err) {
    return c.json({ error: 'Failed to list plugins', details: String(err) }, 500)
  }
})

pluginsRoutes.post('/', zValidator('json', installPluginSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')

  try {
    const plugin = {
      id: nanoid(),
      name: data.name,
      version: data.version,
      enabled: true,
      config: JSON.stringify(data.config || {}),
      userId: user.id,
    }

    await db.insert(plugins).values(plugin)

    console.log(`[Plugins] Installed plugin ${plugin.name} for user ${user.id}`)
    return c.json(
      {
        plugin: { ...plugin, config: data.config || {} },
      },
      201
    )
  } catch (err) {
    return c.json({ error: 'Failed to install plugin', details: String(err) }, 500)
  }
})

pluginsRoutes.delete('/:id', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  try {
    const plugin = await db
      .select()
      .from(plugins)
      .where(and(eq(plugins.id, id), eq(plugins.userId, user.id)))
      .get()

    if (!plugin) {
      return c.json({ error: 'Plugin not found' }, 404)
    }

    await db.delete(plugins).where(eq(plugins.id, id))
    return c.json({ message: 'Plugin uninstalled' })
  } catch (err) {
    return c.json({ error: 'Failed to uninstall plugin', details: String(err) }, 500)
  }
})

pluginsRoutes.patch('/:id', zValidator('json', updatePluginSchema), async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()
  const data = c.req.valid('json')

  try {
    const plugin = await db
      .select()
      .from(plugins)
      .where(and(eq(plugins.id, id), eq(plugins.userId, user.id)))
      .get()

    if (!plugin) {
      return c.json({ error: 'Plugin not found' }, 404)
    }

    const updateData: Partial<typeof plugin> = {}
    if (data.enabled !== undefined) updateData.enabled = data.enabled
    if (data.config !== undefined) updateData.config = JSON.stringify(data.config)

    await db.update(plugins).set(updateData).where(eq(plugins.id, id))

    const updated = await db.select().from(plugins).where(eq(plugins.id, id)).get()
    return c.json({
      plugin: { ...updated, config: JSON.parse(updated?.config || '{}') },
    })
  } catch (err) {
    return c.json({ error: 'Failed to update plugin', details: String(err) }, 500)
  }
})

export { pluginsRoutes }
