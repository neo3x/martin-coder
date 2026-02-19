import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import {
  hashPassword,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  verifyToken,
} from '../services/auth.js'
import { authMiddleware } from '../middleware/auth.js'
import type { User } from '../db/schema.js'

type Variables = {
  user: User
}

const authRoutes = new Hono<{ Variables: Variables }>()

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(32),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const refreshSchema = z.object({
  refreshToken: z.string(),
})

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, username, password, fullName } = c.req.valid('json')

  try {
    // Check if email is taken
    const existingEmail = await db.select().from(users).where(eq(users.email, email)).get()
    if (existingEmail) {
      return c.json({ error: 'Email already registered' }, 409)
    }

    // Check if username is taken
    const existingUsername = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get()
    if (existingUsername) {
      return c.json({ error: 'Username already taken' }, 409)
    }

    const hashedPassword = await hashPassword(password)
    const userId = nanoid()

    const newUser = {
      id: userId,
      email,
      username,
      hashedPassword,
      fullName: fullName || null,
      isActive: true,
      isSuperuser: false,
      isVerified: false,
    }

    await db.insert(users).values(newUser)

    const accessToken = await createAccessToken(userId)
    const refreshToken = await createRefreshToken(userId)

    console.log(`[Auth] New user registered: ${email}`)

    return c.json(
      {
        user: {
          id: userId,
          email,
          username,
          fullName: fullName || null,
          isActive: true,
          isVerified: false,
        },
        accessToken,
        refreshToken,
      },
      201
    )
  } catch (err) {
    console.error('[Auth] Registration error:', err)
    return c.json({ error: 'Registration failed', details: String(err) }, 500)
  }
})

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  try {
    const user = await db.select().from(users).where(eq(users.email, email)).get()

    if (!user || !user.hashedPassword) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    if (!user.isActive) {
      return c.json({ error: 'Account is disabled' }, 403)
    }

    const isValid = await verifyPassword(password, user.hashedPassword)
    if (!isValid) {
      return c.json({ error: 'Invalid email or password' }, 401)
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date().toISOString() })
      .where(eq(users.id, user.id))

    const accessToken = await createAccessToken(user.id)
    const refreshToken = await createRefreshToken(user.id)

    console.log(`[Auth] User logged in: ${email}`)

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        isVerified: user.isVerified,
        defaultProvider: user.defaultProvider,
        defaultModel: user.defaultModel,
      },
      accessToken,
      refreshToken,
    })
  } catch (err) {
    console.error('[Auth] Login error:', err)
    return c.json({ error: 'Login failed', details: String(err) }, 500)
  }
})

authRoutes.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid('json')

  try {
    const payload = await verifyToken(refreshToken)

    if (payload.type !== 'refresh') {
      return c.json({ error: 'Invalid token type' }, 401)
    }

    const user = await db.select().from(users).where(eq(users.id, payload.sub)).get()
    if (!user || !user.isActive) {
      return c.json({ error: 'User not found or disabled' }, 401)
    }

    const newAccessToken = await createAccessToken(user.id)
    const newRefreshToken = await createRefreshToken(user.id)

    return c.json({ accessToken: newAccessToken, refreshToken: newRefreshToken })
  } catch (err) {
    return c.json({ error: 'Invalid or expired refresh token' }, 401)
  }
})

authRoutes.post('/logout', authMiddleware, async (c) => {
  // In a stateless JWT system, logout is handled client-side by discarding tokens
  // For a full implementation, we'd maintain a token blacklist
  return c.json({ message: 'Logged out successfully' })
})

authRoutes.get('/me', authMiddleware, async (c) => {
  const user = c.get('user')
  return c.json({
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
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  })
})

export { authRoutes }
