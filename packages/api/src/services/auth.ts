import * as bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'martin-coder-dev-secret-change-in-production'
const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET)

const ACCESS_TOKEN_EXPIRY = '30m'
const REFRESH_TOKEN_EXPIRY = '7d'

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET_BYTES)
}

export async function createRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET_BYTES)
}

export async function verifyToken(token: string): Promise<{
  sub: string
  type: string
  iat: number
  exp: number
}> {
  const { payload } = await jwtVerify(token, JWT_SECRET_BYTES)
  return payload as { sub: string; type: string; iat: number; exp: number }
}

export function validateApiKey(key: string): boolean {
  // API keys should be at least 32 characters and alphanumeric with dashes
  return /^[a-zA-Z0-9_\-]{32,}$/.test(key)
}

export function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let key = 'mc_'
  for (let i = 0; i < 48; i++) {
    key += chars[Math.floor(Math.random() * chars.length)]
  }
  return key
}
