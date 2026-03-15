/**
 * Diff service - generates structured, unified diffs between file versions.
 * Pure implementation, no external dependencies.
 */

export interface DiffLine {
  type: 'context' | 'added' | 'removed'
  content: string
  lineNumberBefore?: number
  lineNumberAfter?: number
}

export interface DiffHunk {
  startLineBefore: number
  startLineAfter: number
  contextBefore: number
  contextAfter: number
  lines: DiffLine[]
}

export interface FileDiff {
  filePath: string
  changeType: 'created' | 'modified' | 'deleted'
  linesAdded: number
  linesRemoved: number
  hunks: DiffHunk[]
  unifiedText: string
  summary: string
}

const CONTEXT_LINES = 3

/**
 * Compute longest common subsequence of two arrays.
 * Returns edit script as array of ops.
 */
function lcs(a: string[], b: string[]): Array<{ type: 'equal' | 'insert' | 'delete'; value: string }> {
  const m = a.length
  const n = b.length

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to find the edit script
  const ops: Array<{ type: 'equal' | 'insert' | 'delete'; value: string }> = []
  let i = m
  let j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.unshift({ type: 'equal', value: a[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: 'insert', value: b[j - 1] })
      j--
    } else {
      ops.unshift({ type: 'delete', value: a[i - 1] })
      i--
    }
  }

  return ops
}

/**
 * Generate a unified diff between two file contents.
 */
export function generateDiff(
  filePath: string,
  contentBefore: string | null,
  contentAfter: string | null
): FileDiff {
  const changeType: 'created' | 'modified' | 'deleted' =
    contentBefore === null ? 'created' : contentAfter === null ? 'deleted' : 'modified'

  const before = (contentBefore ?? '').split('\n')
  const after = (contentAfter ?? '').split('\n')

  if (changeType === 'created') {
    const lines = after.map((line, i) => ({
      type: 'added' as const,
      content: line,
      lineNumberAfter: i + 1,
    }))
    const unifiedText = buildUnifiedHeader(filePath, changeType) +
      after.map(l => `+${l}`).join('\n')
    return {
      filePath,
      changeType,
      linesAdded: after.length,
      linesRemoved: 0,
      hunks: after.length > 0 ? [{
        startLineBefore: 0,
        startLineAfter: 1,
        contextBefore: 0,
        contextAfter: after.length,
        lines,
      }] : [],
      unifiedText,
      summary: `Created with ${after.length} lines`,
    }
  }

  if (changeType === 'deleted') {
    const lines = before.map((line, i) => ({
      type: 'removed' as const,
      content: line,
      lineNumberBefore: i + 1,
    }))
    const unifiedText = buildUnifiedHeader(filePath, changeType) +
      before.map(l => `-${l}`).join('\n')
    return {
      filePath,
      changeType,
      linesAdded: 0,
      linesRemoved: before.length,
      hunks: before.length > 0 ? [{
        startLineBefore: 1,
        startLineAfter: 0,
        contextBefore: before.length,
        contextAfter: 0,
        lines,
      }] : [],
      unifiedText,
      summary: `Deleted (${before.length} lines removed)`,
    }
  }

  // Modified: compute LCS-based diff
  const ops = lcs(before, after)

  // Build structured diff lines with line numbers
  const diffLines: DiffLine[] = []
  let lineBefore = 1
  let lineAfter = 1

  for (const op of ops) {
    if (op.type === 'equal') {
      diffLines.push({ type: 'context', content: op.value, lineNumberBefore: lineBefore, lineNumberAfter: lineAfter })
      lineBefore++
      lineAfter++
    } else if (op.type === 'delete') {
      diffLines.push({ type: 'removed', content: op.value, lineNumberBefore: lineBefore })
      lineBefore++
    } else {
      diffLines.push({ type: 'added', content: op.value, lineNumberAfter: lineAfter })
      lineAfter++
    }
  }

  // Group into hunks (runs of changed lines with context)
  const hunks = groupIntoHunks(diffLines)

  const linesAdded = diffLines.filter(l => l.type === 'added').length
  const linesRemoved = diffLines.filter(l => l.type === 'removed').length

  const unifiedText = buildUnifiedText(filePath, hunks, changeType)
  const summary = buildSummary(linesAdded, linesRemoved, hunks.length)

  return {
    filePath,
    changeType,
    linesAdded,
    linesRemoved,
    hunks,
    unifiedText,
    summary,
  }
}

function groupIntoHunks(diffLines: DiffLine[]): DiffHunk[] {
  const hunks: DiffHunk[] = []

  // Find changed line indices
  const changedIndices = diffLines
    .map((l, i) => ({ line: l, i }))
    .filter(({ line }) => line.type !== 'context')
    .map(({ i }) => i)

  if (changedIndices.length === 0) return []

  // Group changed indices into runs with context
  const groups: Array<{ start: number; end: number }> = []
  let groupStart = Math.max(0, changedIndices[0] - CONTEXT_LINES)
  let groupEnd = Math.min(diffLines.length - 1, changedIndices[0] + CONTEXT_LINES)

  for (let k = 1; k < changedIndices.length; k++) {
    const idx = changedIndices[k]
    const newStart = Math.max(0, idx - CONTEXT_LINES)

    if (newStart <= groupEnd + 1) {
      groupEnd = Math.min(diffLines.length - 1, idx + CONTEXT_LINES)
    } else {
      groups.push({ start: groupStart, end: groupEnd })
      groupStart = newStart
      groupEnd = Math.min(diffLines.length - 1, idx + CONTEXT_LINES)
    }
  }
  groups.push({ start: groupStart, end: groupEnd })

  for (const group of groups) {
    const lines = diffLines.slice(group.start, group.end + 1)
    const firstLine = lines[0]
    const lastLine = lines[lines.length - 1]

    hunks.push({
      startLineBefore: firstLine.lineNumberBefore ?? firstLine.lineNumberAfter ?? 1,
      startLineAfter: firstLine.lineNumberAfter ?? firstLine.lineNumberBefore ?? 1,
      contextBefore: lines.filter(l => l.type !== 'added').length,
      contextAfter: lines.filter(l => l.type !== 'removed').length,
      lines,
    })
    void lastLine
  }

  return hunks
}

function buildUnifiedHeader(filePath: string, changeType: string): string {
  if (changeType === 'created') {
    return `--- /dev/null\n+++ b/${filePath}\n`
  }
  if (changeType === 'deleted') {
    return `--- a/${filePath}\n+++ /dev/null\n`
  }
  return `--- a/${filePath}\n+++ b/${filePath}\n`
}

function buildUnifiedText(filePath: string, hunks: DiffHunk[], changeType: 'created' | 'modified' | 'deleted'): string {
  let text = buildUnifiedHeader(filePath, changeType)

  for (const hunk of hunks) {
    text += `@@ -${hunk.startLineBefore},${hunk.contextBefore} +${hunk.startLineAfter},${hunk.contextAfter} @@\n`
    for (const line of hunk.lines) {
      if (line.type === 'context') text += ` ${line.content}\n`
      else if (line.type === 'added') text += `+${line.content}\n`
      else text += `-${line.content}\n`
    }
  }

  return text
}

function buildSummary(added: number, removed: number, hunks: number): string {
  const parts: string[] = []
  if (added > 0) parts.push(`+${added} line${added !== 1 ? 's' : ''}`)
  if (removed > 0) parts.push(`-${removed} line${removed !== 1 ? 's' : ''}`)
  if (parts.length === 0) return 'No changes'
  return `${parts.join(', ')} in ${hunks} hunk${hunks !== 1 ? 's' : ''}`
}

/**
 * Quick check: does the diff have any actual changes?
 */
export function hasDiff(diff: FileDiff): boolean {
  return diff.linesAdded > 0 || diff.linesRemoved > 0
}
