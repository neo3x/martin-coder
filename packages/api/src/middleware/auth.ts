import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { verifyToken } from '../services/auth.js'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import type { User } from '../db/schema.js'

type Variables = {
  user: User
}

export const authMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing or invalid Authorization header' })
  }

  const token = authHeader.slice(7)

  let payload: { sub: string; type: string } | null = null
  try {
    payload = await verifyToken(token) as { sub: string; type: string }
  } catch (err) {
    throw new HTTPException(401, { message: 'Invalid or expired token' })
  }

  if (!payload || payload.type !== 'access') {
    throw new HTTPException(401, { message: 'Invalid token type' })
  }

  const user = await db.select().from(users).where(eq(users.id, payload.sub)).get()

  if (!user) {
    throw new HTTPException(401, { message: 'User not found' })
  }

  if (!user.isActive) {
    throw new HTTPException(403, { message: 'User account is disabled' })
  }

  c.set('user', user)
  await next()
})

export const optionalAuthMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)

    try {
      const payload = await verifyToken(token) as { sub: string; type: string }

      if (payload && payload.type === 'access') {
        const user = await db.select().from(users).where(eq(users.id, payload.sub)).get()

        if (user && user.isActive) {
          c.set('user', user)
        }
      }
    } catch {
      // Optional auth - silently ignore errors
    }
  }

  await next()
})
