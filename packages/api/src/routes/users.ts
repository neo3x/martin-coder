import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { hashPassword } from '../services/auth.js'
import type { User } from '../db/schema.js'

type Variables = {
  user: User
}

const usersRoutes = new Hono<{ Variables: Variables }>()
usersRoutes.use('*', authMiddleware)

const updateUserSchema = z.object({
  fullName: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  defaultProvider: z.enum(['anthropic', 'openai', 'google', 'ollama']).optional(),
  defaultModel: z.string().optional(),
  anthropicApiKey: z.string().optional().or(z.literal('')),
  openaiApiKey: z.string().optional().or(z.literal('')),
  googleApiKey: z.string().optional().or(z.literal('')),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
})

function sanitizeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    isSuperuser: user.isSuperuser,
    isVerified: user.isVerified,
    defaultProvider: user.defaultProvider,
    defaultModel: user.defaultModel,
    hasAnthropicKey: !!user.anthropicApiKey,
    hasOpenaiKey: !!user.openaiApiKey,
    hasGoogleKey: !!user.googleApiKey,
    oauthProvider: user.oauthProvider,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  }
}

usersRoutes.get('/me', async (c) => {
  const user = c.get('user')
  return c.json({ user: sanitizeUser(user) })
})

usersRoutes.patch('/me', zValidator('json', updateUserSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')

  try {
    const updateData: Partial<User> = {
      updatedAt: new Date().toISOString(),
    }

    if (data.fullName !== undefined) updateData.fullName = data.fullName || null
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl || null
    if (data.defaultProvider !== undefined) updateData.defaultProvider = data.defaultProvider
    if (data.defaultModel !== undefined) updateData.defaultModel = data.defaultModel

    // Handle API key updates - store as-is (in production, encrypt these)
    if (data.anthropicApiKey !== undefined) {
      updateData.anthropicApiKey = data.anthropicApiKey || null
    }
    if (data.openaiApiKey !== undefined) {
      updateData.openaiApiKey = data.openaiApiKey || null
    }
    if (data.googleApiKey !== undefined) {
      updateData.googleApiKey = data.googleApiKey || null
    }

    // Handle password change
    if (data.newPassword) {
      if (!data.currentPassword) {
        return c.json({ error: 'Current password is required to change password' }, 400)
      }

      const { verifyPassword } = await import('../services/auth.js')
      if (!user.hashedPassword) {
        return c.json({ error: 'Cannot change password for OAuth accounts' }, 400)
      }

      const isValid = await verifyPassword(data.currentPassword, user.hashedPassword)
      if (!isValid) {
        return c.json({ error: 'Current password is incorrect' }, 400)
      }

      updateData.hashedPassword = await hashPassword(data.newPassword)
    }

    await db.update(users).set(updateData).where(eq(users.id, user.id))

    const updated = await db.select().from(users).where(eq(users.id, user.id)).get()
    if (!updated) {
      return c.json({ error: 'User not found after update' }, 500)
    }

    return c.json({ user: sanitizeUser(updated) })
  } catch (err) {
    return c.json({ error: 'Failed to update user', details: String(err) }, 500)
  }
})

// Admin only: list all users
usersRoutes.get('/', async (c) => {
  const user = c.get('user')

  if (!user.isSuperuser) {
    return c.json({ error: 'Admin access required' }, 403)
  }

  try {
    const allUsers = await db.select().from(users).all()
    return c.json({ users: allUsers.map(sanitizeUser) })
  } catch (err) {
    return c.json({ error: 'Failed to list users', details: String(err) }, 500)
  }
})

export { usersRoutes }
