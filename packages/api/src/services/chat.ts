import { streamText, type CoreMessage } from 'ai'
import { getProviderModel, calculateCost, getContextLimit } from '../providers/index.js'
import { getAgent } from '../agents/index.js'
import { getToolsForAgent, setToolExecutionContext, clearToolExecutionContext } from '../tools/index.js'
import { getSession, addMessage, shouldAutoCompact, autoCompact } from './session.js'
import { db } from '../db/index.js'
import { sessions, messages } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import type { Message } from '../db/schema.js'
import { parseSessionSafetySettings } from './safety.js'

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'finish' | 'error'
  content?: string
  toolName?: string
  toolArgs?: Record<string, unknown>
  toolResult?: unknown
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cost: number
  }
  error?: string
}

function dbMessageToCoreMessage(msg: Message): CoreMessage {
  if (msg.role === 'user') {
    return { role: 'user', content: msg.content }
  } else if (msg.role === 'assistant') {
    return { role: 'assistant', content: msg.content }
  } else {
    return { role: 'user', content: msg.content }
  }
}

export async function streamMessage(
  sessionId: string,
  userMessage: string,
  agentName?: string,
  onChunk?: (chunk: StreamChunk) => void,
  userApiKey?: string
): Promise<{ assistantMessage: string; usage: StreamChunk['usage'] }> {
  const sessionData = await getSession(sessionId)
  if (!sessionData) {
    throw new Error(`Session not found: ${sessionId}`)
  }

  const { provider, model } = sessionData
  const safetySettings = parseSessionSafetySettings(sessionData.safetySettings)
  const toolContext = {
    readOnlyMode: safetySettings.readOnlyMode,
    requireApprovalForCommands: safetySettings.requireApprovalForCommands,
    writableRoots: safetySettings.writableRoots,
    allowCommandPatterns: safetySettings.allowCommandPatterns,
    denyCommandPatterns: safetySettings.denyCommandPatterns,
  }

  // Check if we need to auto-compact
  const needsCompact = await shouldAutoCompact(sessionId, model)
  if (needsCompact) {
    console.log(`[Chat] Auto-compacting session ${sessionId}`)
    await autoCompact(sessionId, provider, model, userApiKey)
    onChunk?.({ type: 'text', content: '[Context auto-compacted to save space]\n\n' })
  }

  // Save user message
  await addMessage(sessionId, {
    role: 'user',
    content: userMessage,
  })

  // Build messages for the LLM
  const coreMessages: CoreMessage[] = []

  // Add system prompt if present
  if (sessionData.systemPrompt) {
    coreMessages.push({ role: 'system' as const, content: sessionData.systemPrompt })
  }

  // Add agent system prompt if agent is specified
  const agent = agentName ? getAgent(agentName) : null
  if (agent) {
    coreMessages.push({ role: 'system' as const, content: agent.systemPrompt })
  }

  // Re-fetch messages after potential compaction
  const freshSession = await getSession(sessionId)
  const sessionMessages = (freshSession?.messages || []).filter(
    (m) => m.role !== 'user' || m.content !== userMessage
  )

  // Add history messages
  for (const msg of sessionMessages) {
    if (msg.role === 'system') {
      coreMessages.push({ role: 'system' as const, content: msg.content })
    } else {
      coreMessages.push(dbMessageToCoreMessage(msg))
    }
  }

  // Add the current user message
  coreMessages.push({ role: 'user', content: userMessage })

  // Get tools if agent is specified
  const tools = agent ? getToolsForAgent(agent.tools) : undefined

  const llmModel = getProviderModel(provider, model, userApiKey)

  let fullText = ''
  let promptTokens = 0
  let completionTokens = 0

  try {
    setToolExecutionContext(toolContext)

    const stream = streamText({
      model: llmModel,
      messages: coreMessages,
      tools: tools && Object.keys(tools).length > 0 ? tools : undefined,
      maxTokens: 8192,
      temperature: 0.7,
      onChunk({ chunk }) {
        if (chunk.type === 'text-delta') {
          fullText += chunk.textDelta
          onChunk?.({ type: 'text', content: chunk.textDelta })
        } else if (chunk.type === 'tool-call') {
          onChunk?.({
            type: 'tool_call',
            toolName: chunk.toolName,
            toolArgs: chunk.args as Record<string, unknown>,
          })
        } else if (chunk.type === 'tool-result') {
          onChunk?.({
            type: 'tool_result',
            toolName: chunk.toolName,
            toolResult: chunk.result,
          })
        }
      },
    })

    // Consume the stream
    for await (const chunk of stream.textStream) {
      // Already handled in onChunk
      void chunk
    }

    const usage = await stream.usage
    promptTokens = usage?.promptTokens || 0
    completionTokens = usage?.completionTokens || 0

    const cost = calculateCost(model, promptTokens, completionTokens)

    const usageInfo: StreamChunk['usage'] = {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      cost,
    }

    onChunk?.({ type: 'finish', usage: usageInfo })

    // Save assistant message
    await addMessage(sessionId, {
      role: 'assistant',
      content: fullText,
      promptTokens,
      completionTokens,
      costUsd: cost,
      model,
    })

    // Update session title if it's the first message
    if (sessionData.messages.length === 0) {
      const title = userMessage.slice(0, 60) + (userMessage.length > 60 ? '...' : '')
      await db
        .update(sessions)
        .set({ title, updatedAt: new Date().toISOString() })
        .where(eq(sessions.id, sessionId))
    }

    return { assistantMessage: fullText, usage: usageInfo }
  } catch (err) {
    const errorMessage = String(err)
    onChunk?.({ type: 'error', error: errorMessage })
    throw err
  } finally {
    clearToolExecutionContext()
  }
}

export async function sendMessage(
  sessionId: string,
  userMessage: string,
  agentName?: string,
  userApiKey?: string
): Promise<{ assistantMessage: string; usage: StreamChunk['usage'] }> {
  return streamMessage(sessionId, userMessage, agentName, undefined, userApiKey)
}
