import { streamText, type CoreMessage } from 'ai'
import { getProviderModel, calculateCost, getContextLimit } from '../providers/index.js'
import { getAgent } from '../agents/index.js'
import { getToolsForAgent, setToolExecutionContext, clearToolExecutionContext } from '../tools/index.js'
import { getSession, addMessage, shouldAutoCompact, autoCompact } from './session.js'
import { db } from '../db/index.js'
import { sessions, projects } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import type { Message } from '../db/schema.js'
import { parseSessionSafetySettings } from './safety.js'
import {
  createExecution,
  updateExecutionPhase,
  setActiveExecution,
  saveValidationResults,
  type ExecutionPhase,
} from './execution.js'
import {
  runValidationPipeline,
  formatValidationForChat,
} from './validation.js'

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'finish' | 'error' | 'task_status' | 'file_changed' | 'validation_result'
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
  // task_status fields
  phase?: ExecutionPhase
  statusMessage?: string
  executionId?: string
  // file_changed fields
  fileChange?: {
    snapshotId: string
    filePath: string
    changeType: 'created' | 'modified' | 'deleted'
    linesAdded: number
    linesRemoved: number
    diffText: string
  }
  // validation_result fields
  validation?: {
    toolType: string
    toolCommand: string
    passed: boolean
    errorCount: number
    warningCount: number
    stdout: string
    stderr: string
    durationMs: number
  }
  validationSummary?: {
    allPassed: boolean
    totalErrors: number
    totalWarnings: number
    toolsRun: number
    summary: string
  }
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
): Promise<{ assistantMessage: string; usage: StreamChunk['usage']; executionId?: string }> {
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

  // Create execution record for traceability
  const executionId = await createExecution(
    sessionId,
    sessionData.userId,
    userMessage,
    agentName || 'build'
  )

  const emitPhase = async (phase: ExecutionPhase, message: string) => {
    await updateExecutionPhase(executionId, phase)
    onChunk?.({
      type: 'task_status',
      phase,
      statusMessage: message,
      executionId,
    })
  }

  await emitPhase('understanding', 'Understanding your request…')

  // Check if we need to auto-compact
  const needsCompact = await shouldAutoCompact(sessionId, model)
  if (needsCompact) {
    console.log(`[Chat] Auto-compacting session ${sessionId}`)
    await autoCompact(sessionId, provider, model, userApiKey)
    onChunk?.({ type: 'text', content: '[Context auto-compacted to save space]\n\n' })
  }

  await emitPhase('scanning', 'Scanning session context…')

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

  await emitPhase('reading', 'Reading relevant context…')

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

  await emitPhase('generating', 'Generating response…')

  let fullText = ''
  let promptTokens = 0
  let completionTokens = 0

  const fileChanges: Array<{
    snapshotId: string
    filePath: string
    changeType: 'created' | 'modified' | 'deleted'
    linesAdded: number
    linesRemoved: number
    diffText: string
  }> = []

  try {
    setToolExecutionContext(toolContext)

    // Set active execution context so tools can record file changes
    setActiveExecution({
      executionId,
      sessionId,
      userId: sessionData.userId,
      onPhaseChange: async (phase, message) => {
        await emitPhase(phase, message)
      },
      onFileChange: (snapshot) => {
        fileChanges.push(snapshot)
        onChunk?.({
          type: 'file_changed',
          fileChange: snapshot,
        })
      },
    })

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

    // Run validation if files were changed and we have a project
    let validationText = ''
    if (fileChanges.length > 0 && sessionData.projectId) {
      await emitPhase('validating', `Validating ${fileChanges.length} changed file${fileChanges.length !== 1 ? 's' : ''}…`)

      // Get project path
      const project = await db.select()
        .from(projects)
        .where(eq(projects.id, sessionData.projectId))
        .get()

      if (project?.localPath) {
        const report = await runValidationPipeline(project.localPath)

        // Save validation results to DB
        await saveValidationResults(
          executionId,
          sessionId,
          report.toolsRun.map(r => ({
            toolType: r.toolType,
            toolCommand: r.toolCommand,
            passed: r.passed,
            exitCode: r.exitCode,
            stdout: r.stdout,
            stderr: r.stderr,
            errorCount: r.errorCount,
            warningCount: r.warningCount,
            durationMs: r.durationMs,
          }))
        )

        // Stream each validation result
        for (const result of report.toolsRun) {
          onChunk?.({
            type: 'validation_result',
            validation: result,
          })
        }

        // Stream summary
        onChunk?.({
          type: 'validation_result',
          validationSummary: {
            allPassed: report.allPassed,
            totalErrors: report.totalErrors,
            totalWarnings: report.totalWarnings,
            toolsRun: report.toolsRun.length,
            summary: report.summary,
          },
        })

        validationText = '\n\n---\n' + formatValidationForChat(report)

        await updateExecutionPhase(executionId, report.allPassed ? 'completed' : 'completed', {
          validationPassed: report.allPassed,
          validationSummary: report.summary,
        })
      }
    }

    await emitPhase('completed', fileChanges.length > 0
      ? `Completed — ${fileChanges.length} file${fileChanges.length !== 1 ? 's' : ''} modified`
      : 'Completed')

    onChunk?.({ type: 'finish', usage: usageInfo })

    // Save assistant message (append validation summary if ran)
    const finalContent = fullText + validationText
    await addMessage(sessionId, {
      role: 'assistant',
      content: finalContent,
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

    return { assistantMessage: finalContent, usage: usageInfo, executionId }
  } catch (err) {
    const errorMessage = String(err)
    await updateExecutionPhase(executionId, 'failed', { errorMessage })
    onChunk?.({ type: 'error', error: errorMessage })
    throw err
  } finally {
    clearToolExecutionContext()
    setActiveExecution(null)
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
