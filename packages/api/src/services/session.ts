import { db } from '../db/index.js'
import { sessions, messages } from '../db/schema.js'
import { eq, desc } from 'drizzle-orm'
import type { Session, NewSession, Message, NewMessage } from '../db/schema.js'
import { nanoid } from 'nanoid'
import { getProviderModel, calculateCost, getContextLimit } from '../providers/index.js'
import { generateText } from 'ai'
import { parseSessionSafetySettings, DEFAULT_SESSION_SAFETY_SETTINGS, type SessionSafetySettings } from './safety.js'

export async function createSession(
  userId: string,
  data: Partial<NewSession> & { safetySettings?: SessionSafetySettings }
): Promise<Session> {
  const session: NewSession = {
    id: nanoid(),
    userId,
    title: data.title || 'New Session',
    projectId: data.projectId,
    provider: data.provider || 'anthropic',
    model: data.model || 'claude-sonnet-4-5-20250929',
    systemPrompt: data.systemPrompt,
    contextFiles: data.contextFiles || '[]',
    safetySettings: JSON.stringify(data.safetySettings || DEFAULT_SESSION_SAFETY_SETTINGS),
    messageCount: 0,
    totalTokens: 0,
    totalCost: 0,
    autoCompacted: false,
  }

  await db.insert(sessions).values(session)
  console.log(`[Session] Created session ${session.id} for user ${userId}`)
  return session as Session
}

export async function getSession(id: string): Promise<(Session & { messages: Message[] }) | null> {
  const session = await db.select().from(sessions).where(eq(sessions.id, id)).get()
  if (!session) return null

  const sessionMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, id))
    .orderBy(messages.createdAt)
    .all()

  return {
    ...session,
    safetySettings: JSON.stringify(parseSessionSafetySettings(session.safetySettings)),
    messages: sessionMessages,
  }
}

export async function listSessions(userId: string): Promise<Session[]> {
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.updatedAt))
    .all()
}

export async function updateSession(
  id: string,
  data: Partial<Omit<Session, 'id' | 'userId' | 'createdAt'>>
): Promise<Session | null> {
  await db
    .update(sessions)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(sessions.id, id))

  return db.select().from(sessions).where(eq(sessions.id, id)).get() || null
}

export async function deleteSession(id: string): Promise<boolean> {
  // Delete messages first (FK constraint)
  await db.delete(messages).where(eq(messages.sessionId, id))
  await db.delete(sessions).where(eq(sessions.id, id))
  console.log(`[Session] Deleted session ${id}`)
  return true
}

export async function addMessage(
  sessionId: string,
  message: Omit<NewMessage, 'id' | 'sessionId' | 'createdAt'>
): Promise<Message> {
  const newMessage: NewMessage = {
    id: nanoid(),
    sessionId,
    ...message,
    toolCalls: message.toolCalls || '[]',
    toolResults: message.toolResults || '[]',
  }

  await db.insert(messages).values(newMessage)

  // Update session stats
  const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).get()
  if (session) {
    const promptTokens = message.promptTokens || 0
    const completionTokens = message.completionTokens || 0
    const cost = message.costUsd || 0

    await db
      .update(sessions)
      .set({
        messageCount: (session.messageCount || 0) + 1,
        totalTokens: (session.totalTokens || 0) + promptTokens + completionTokens,
        totalCost: (session.totalCost || 0) + cost,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sessions.id, sessionId))
  }

  return newMessage as Message
}

export async function getMessages(sessionId: string): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(messages.createdAt)
    .all()
}


export async function getSessionSafetySettings(sessionId: string): Promise<SessionSafetySettings> {
  const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).get()
  if (!session) throw new Error(`Session not found: ${sessionId}`)
  return parseSessionSafetySettings(session.safetySettings)
}

export async function updateSessionSafetySettings(
  sessionId: string,
  settings: SessionSafetySettings
): Promise<SessionSafetySettings> {
  await db
    .update(sessions)
    .set({
      safetySettings: JSON.stringify(settings),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(sessions.id, sessionId))

  return settings
}

export async function autoCompact(
  sessionId: string,
  provider: string,
  model: string,
  apiKey?: string
): Promise<void> {
  const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).get()
  if (!session) throw new Error(`Session not found: ${sessionId}`)

  const allMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(messages.createdAt)
    .all()

  if (allMessages.length <= 10) {
    // Not enough messages to compact
    return
  }

  console.log(`[Session] Auto-compacting session ${sessionId} (${allMessages.length} messages)`)

  // Keep the last 10 messages and summarize the rest
  const messagesToSummarize = allMessages.slice(0, allMessages.length - 10)
  const recentMessages = allMessages.slice(allMessages.length - 10)

  // Build conversation to summarize
  const conversationText = messagesToSummarize
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  try {
    const llmModel = getProviderModel(provider, model, apiKey)

    const { text: summary } = await generateText({
      model: llmModel,
      messages: [
        {
          role: 'user',
          content: `Please provide a concise summary of the following conversation that captures all important context, decisions made, and work completed. This summary will be used to continue the conversation.\n\n${conversationText}`,
        },
      ],
    })

    // Delete all old messages
    for (const msg of messagesToSummarize) {
      await db.delete(messages).where(eq(messages.id, msg.id))
    }

    // Insert summary as a system message
    const summaryMessage: NewMessage = {
      id: nanoid(),
      sessionId,
      role: 'system',
      content: `[Context Summary - Previous conversation compacted]\n\n${summary}`,
      toolCalls: '[]',
      toolResults: '[]',
    }
    await db.insert(messages).values(summaryMessage)

    // Mark session as auto-compacted
    await db
      .update(sessions)
      .set({ autoCompacted: true, updatedAt: new Date().toISOString() })
      .where(eq(sessions.id, sessionId))

    console.log(`[Session] Auto-compact complete. Kept ${recentMessages.length} recent messages.`)
  } catch (err) {
    console.error(`[Session] Auto-compact failed:`, err)
    throw err
  }
}

export async function shouldAutoCompact(
  sessionId: string,
  model: string
): Promise<boolean> {
  const contextLimit = getContextLimit(model)
  const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).get()

  if (!session) return false

  const tokenThreshold = contextLimit * 0.9 // 90% threshold
  return (session.totalTokens || 0) > tokenThreshold
}
