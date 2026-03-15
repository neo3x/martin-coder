/**
 * Execution tracking service.
 * Tracks the full lifecycle of each AI execution (user prompt → changes → validation → done).
 * Provides rollback capability through file snapshots.
 */

import { nanoid } from 'nanoid'
import { db } from '../db/index.js'
import { executions, fileSnapshots, validationResults } from '../db/schema.js'
import { eq, desc } from 'drizzle-orm'
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { dirname } from 'path'
import { generateDiff } from './diff.js'

export type ExecutionPhase =
  | 'understanding'
  | 'scanning'
  | 'reading'
  | 'building'
  | 'waiting_approval'
  | 'generating'
  | 'applying'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'rolled_back'

export interface ExecutionContext {
  executionId: string
  sessionId: string
  userId: string
  onPhaseChange?: (phase: ExecutionPhase, message: string) => void
  onFileChange?: (snapshot: {
    snapshotId: string
    filePath: string
    changeType: 'created' | 'modified' | 'deleted'
    linesAdded: number
    linesRemoved: number
    diffText: string
  }) => void
}

// Global active execution context (per-request, set in chat.ts)
let activeExecution: ExecutionContext | null = null

export function setActiveExecution(ctx: ExecutionContext | null): void {
  activeExecution = ctx
}

export function getActiveExecution(): ExecutionContext | null {
  return activeExecution
}

/**
 * Create a new execution record.
 */
export async function createExecution(
  sessionId: string,
  userId: string,
  prompt: string,
  agentName: string
): Promise<string> {
  const id = nanoid()
  await db.insert(executions).values({
    id,
    sessionId,
    userId,
    prompt,
    agentName,
    phase: 'understanding',
    filesChanged: 0,
  })
  return id
}

/**
 * Update execution phase.
 */
export async function updateExecutionPhase(
  executionId: string,
  phase: ExecutionPhase,
  extraData?: { errorMessage?: string; validationPassed?: boolean; validationSummary?: string }
): Promise<void> {
  await db
    .update(executions)
    .set({
      phase,
      ...(extraData?.errorMessage !== undefined ? { errorMessage: extraData.errorMessage } : {}),
      ...(extraData?.validationPassed !== undefined ? { validationPassed: extraData.validationPassed } : {}),
      ...(extraData?.validationSummary !== undefined ? { validationSummary: extraData.validationSummary } : {}),
      ...(phase === 'completed' || phase === 'failed' || phase === 'rolled_back'
        ? { completedAt: new Date().toISOString() }
        : {}),
    })
    .where(eq(executions.id, executionId))
}

/**
 * Record a file change with snapshot data.
 * Called by tools before/after file modifications.
 */
export async function recordFileChange(
  executionId: string,
  sessionId: string,
  filePath: string,
  contentBefore: string | null,
  contentAfter: string | null
): Promise<string> {
  const changeType = contentBefore === null ? 'created' : contentAfter === null ? 'deleted' : 'modified'

  const diff = generateDiff(filePath, contentBefore, contentAfter)

  const id = nanoid()
  await db.insert(fileSnapshots).values({
    id,
    executionId,
    sessionId,
    filePath,
    changeType,
    contentBefore,
    contentAfter,
    diffText: diff.unifiedText,
    linesAdded: diff.linesAdded,
    linesRemoved: diff.linesRemoved,
    isRestored: false,
  })

  // Update filesChanged count on execution
  const current = await db.select({ filesChanged: executions.filesChanged })
    .from(executions)
    .where(eq(executions.id, executionId))
    .get()

  if (current) {
    await db.update(executions)
      .set({ filesChanged: (current.filesChanged || 0) + 1 })
      .where(eq(executions.id, executionId))
  }

  return id
}

/**
 * Rollback an entire execution by restoring all file snapshots.
 */
export async function rollbackExecution(executionId: string): Promise<{
  filesRestored: number
  errors: string[]
}> {
  const snapshots = await db
    .select()
    .from(fileSnapshots)
    .where(eq(fileSnapshots.executionId, executionId))

  const errors: string[] = []
  let filesRestored = 0

  for (const snap of snapshots) {
    try {
      if (snap.changeType === 'created') {
        // File was created by execution — delete it to rollback
        if (existsSync(snap.filePath)) {
          unlinkSync(snap.filePath)
        }
      } else if (snap.changeType === 'deleted' && snap.contentBefore) {
        // File was deleted by execution — recreate it
        const dir = dirname(snap.filePath)
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        writeFileSync(snap.filePath, snap.contentBefore, 'utf-8')
      } else if (snap.changeType === 'modified' && snap.contentBefore !== null) {
        // Restore original content
        const dir = dirname(snap.filePath)
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        writeFileSync(snap.filePath, snap.contentBefore, 'utf-8')
      }

      // Mark snapshot as restored
      await db.update(fileSnapshots)
        .set({ isRestored: true })
        .where(eq(fileSnapshots.id, snap.id))

      filesRestored++
    } catch (err) {
      errors.push(`Failed to restore ${snap.filePath}: ${String(err)}`)
    }
  }

  // Mark execution as rolled back
  await updateExecutionPhase(executionId, 'rolled_back')

  return { filesRestored, errors }
}

/**
 * Get execution with all its file snapshots.
 */
export async function getExecution(executionId: string) {
  const execution = await db
    .select()
    .from(executions)
    .where(eq(executions.id, executionId))
    .get()

  if (!execution) return null

  const snapshots = await db
    .select()
    .from(fileSnapshots)
    .where(eq(fileSnapshots.executionId, executionId))

  const validation = await db
    .select()
    .from(validationResults)
    .where(eq(validationResults.executionId, executionId))

  return { ...execution, snapshots, validationResults: validation }
}

/**
 * List executions for a session.
 */
export async function listExecutions(sessionId: string) {
  return db
    .select()
    .from(executions)
    .where(eq(executions.sessionId, sessionId))
    .orderBy(desc(executions.createdAt))
}

/**
 * Save validation results for an execution.
 */
export async function saveValidationResults(
  executionId: string,
  sessionId: string,
  results: Array<{
    toolType: string
    toolCommand: string
    passed: boolean
    exitCode: number
    stdout: string
    stderr: string
    errorCount: number
    warningCount: number
    durationMs: number
  }>
): Promise<void> {
  if (results.length === 0) return

  await db.insert(validationResults).values(
    results.map(r => ({
      id: nanoid(),
      executionId,
      sessionId,
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

  const allPassed = results.every(r => r.passed)
  const summary = results
    .map(r => `${r.toolType}: ${r.passed ? 'passed' : `failed (${r.errorCount} errors)`}`)
    .join(', ')

  await db.update(executions)
    .set({ validationPassed: allPassed, validationSummary: summary })
    .where(eq(executions.id, executionId))
}

/**
 * Hook: called by tools before writing a file.
 * Returns the previous content for snapshot creation.
 */
export function readFileForSnapshot(filePath: string): string | null {
  try {
    if (!existsSync(filePath)) return null
    return readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}
