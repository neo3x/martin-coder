/**
 * Validation pipeline service.
 * Detects available validation tools from project configuration
 * and runs them after code changes to verify safety.
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

export interface ValidationTool {
  type: 'lint' | 'typecheck' | 'test' | 'build'
  command: string
  label: string
}

export interface ValidationRunResult {
  toolType: string
  toolCommand: string
  passed: boolean
  exitCode: number
  stdout: string
  stderr: string
  errorCount: number
  warningCount: number
  durationMs: number
}

export interface ValidationReport {
  projectPath: string
  toolsRun: ValidationRunResult[]
  allPassed: boolean
  totalErrors: number
  totalWarnings: number
  summary: string
  durationMs: number
}

/**
 * Detect what validation tools are available in a project directory.
 */
export function detectValidationTools(projectPath: string): ValidationTool[] {
  const tools: ValidationTool[] = []

  if (!existsSync(projectPath)) return tools

  // Read package.json for script detection
  const pkgPath = join(projectPath, 'package.json')
  let pkg: Record<string, unknown> = {}
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>
    } catch {
      // invalid json, skip
    }
  }

  const scripts = (pkg.scripts as Record<string, string>) || {}
  const deps = {
    ...((pkg.dependencies as Record<string, string>) || {}),
    ...((pkg.devDependencies as Record<string, string>) || {}),
  }

  // TypeScript typecheck
  const hasTsConfig = existsSync(join(projectPath, 'tsconfig.json'))
  const hasTsc = 'typescript' in deps || existsSync(join(projectPath, 'node_modules/.bin/tsc'))

  if (hasTsConfig && hasTsc) {
    const tscCmd = scripts['typecheck'] || scripts['type-check'] || scripts['tsc']
      ? `npm run ${scripts['typecheck'] ? 'typecheck' : scripts['type-check'] ? 'type-check' : 'tsc'}`
      : 'npx tsc --noEmit'
    tools.push({ type: 'typecheck', command: tscCmd, label: 'TypeScript' })
  }

  // ESLint
  const hasEslint = existsSync(join(projectPath, '.eslintrc.json')) ||
    existsSync(join(projectPath, '.eslintrc.js')) ||
    existsSync(join(projectPath, '.eslintrc.cjs')) ||
    existsSync(join(projectPath, 'eslint.config.js')) ||
    existsSync(join(projectPath, 'eslint.config.mjs')) ||
    'eslint' in deps

  if (hasEslint) {
    const lintCmd = scripts['lint']
      ? 'npm run lint'
      : 'npx eslint . --ext .ts,.tsx,.js,.jsx --max-warnings=0'
    tools.push({ type: 'lint', command: lintCmd, label: 'ESLint' })
  }

  // Biome
  const hasBiome = existsSync(join(projectPath, 'biome.json')) || 'biome' in deps
  if (hasBiome && !hasEslint) {
    tools.push({ type: 'lint', command: 'npx biome check .', label: 'Biome' })
  }

  // Tests: detect vitest/jest/pytest
  const hasVitest = 'vitest' in deps
  const hasJest = 'jest' in deps
  const hasPytest = existsSync(join(projectPath, 'pytest.ini')) ||
    existsSync(join(projectPath, 'pyproject.toml'))

  if (hasVitest) {
    const testCmd = scripts['test']
      ? 'npm run test -- --run'
      : 'npx vitest run'
    tools.push({ type: 'test', command: testCmd, label: 'Vitest' })
  } else if (hasJest) {
    const testCmd = scripts['test']
      ? 'npm run test -- --passWithNoTests'
      : 'npx jest --passWithNoTests'
    tools.push({ type: 'test', command: testCmd, label: 'Jest' })
  } else if (hasPytest) {
    tools.push({ type: 'test', command: 'python -m pytest --tb=short', label: 'pytest' })
  }

  // Build check (only if not a test-only project)
  if (scripts['build']) {
    tools.push({ type: 'build', command: 'npm run build', label: 'Build' })
  }

  return tools
}

/**
 * Run a single validation tool and capture results.
 */
async function runTool(tool: ValidationTool, projectPath: string): Promise<ValidationRunResult> {
  const start = Date.now()

  try {
    const output = execSync(tool.command, {
      cwd: projectPath,
      timeout: 120_000, // 2 minutes max
      encoding: 'utf-8',
      env: {
        ...process.env,
        CI: '1',
        FORCE_COLOR: '0',
        NO_COLOR: '1',
      },
    })

    const durationMs = Date.now() - start
    const { errorCount, warningCount } = parseOutputCounts(output, tool.type)

    return {
      toolType: tool.type,
      toolCommand: tool.command,
      passed: errorCount === 0,
      exitCode: 0,
      stdout: output,
      stderr: '',
      errorCount,
      warningCount,
      durationMs,
    }
  } catch (err: unknown) {
    const durationMs = Date.now() - start

    let stdout = ''
    let stderr = ''
    let exitCode = 1

    if (err && typeof err === 'object') {
      const execErr = err as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number }
      stdout = execErr.stdout?.toString() || ''
      stderr = execErr.stderr?.toString() || ''
      exitCode = execErr.status || 1
    }

    const combinedOutput = stdout + stderr
    const { errorCount, warningCount } = parseOutputCounts(combinedOutput, tool.type)

    return {
      toolType: tool.type,
      toolCommand: tool.command,
      passed: false,
      exitCode,
      stdout,
      stderr,
      errorCount: Math.max(errorCount, exitCode !== 0 ? 1 : 0),
      warningCount,
      durationMs,
    }
  }
}

/**
 * Parse error/warning counts from tool output.
 */
function parseOutputCounts(output: string, toolType: string): { errorCount: number; warningCount: number } {
  if (!output) return { errorCount: 0, warningCount: 0 }

  // TypeScript: "Found N error(s)"
  const tsErrorMatch = output.match(/Found (\d+) error/i)
  if (tsErrorMatch) {
    return { errorCount: parseInt(tsErrorMatch[1]), warningCount: 0 }
  }

  // ESLint: "N problems (N errors, N warnings)"
  const eslintMatch = output.match(/(\d+) problems? \((\d+) errors?, (\d+) warnings?\)/i)
  if (eslintMatch) {
    return { errorCount: parseInt(eslintMatch[2]), warningCount: parseInt(eslintMatch[3]) }
  }

  // ESLint simpler: "N errors"
  const errorCountMatch = output.match(/(\d+) errors?/i)
  const warnCountMatch = output.match(/(\d+) warnings?/i)

  return {
    errorCount: errorCountMatch ? parseInt(errorCountMatch[1]) : 0,
    warningCount: warnCountMatch ? parseInt(warnCountMatch[1]) : 0,
  }
}

/**
 * Run the full validation pipeline for a project.
 * Returns a structured report.
 */
export async function runValidationPipeline(
  projectPath: string,
  tools?: ValidationTool[]
): Promise<ValidationReport> {
  const start = Date.now()
  const detectedTools = tools ?? detectValidationTools(projectPath)

  if (detectedTools.length === 0) {
    return {
      projectPath,
      toolsRun: [],
      allPassed: true,
      totalErrors: 0,
      totalWarnings: 0,
      summary: 'No validation tools detected',
      durationMs: 0,
    }
  }

  const results: ValidationRunResult[] = []

  // Run tools sequentially (typecheck first, then lint, test, build)
  const order = ['typecheck', 'lint', 'test', 'build']
  const sorted = [...detectedTools].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))

  for (const tool of sorted) {
    console.log(`[Validation] Running ${tool.label}: ${tool.command}`)
    const result = await runTool(tool, projectPath)
    results.push(result)

    // Stop on first hard failure (typecheck or lint errors block tests/build)
    if (!result.passed && result.errorCount > 0 &&
        (result.toolType === 'typecheck' || result.toolType === 'lint')) {
      console.log(`[Validation] Stopping pipeline — ${tool.label} failed`)
      break
    }
  }

  const allPassed = results.every(r => r.passed)
  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0)
  const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0)
  const durationMs = Date.now() - start

  const summary = buildSummary(results, allPassed, totalErrors, totalWarnings)

  return {
    projectPath,
    toolsRun: results,
    allPassed,
    totalErrors,
    totalWarnings,
    summary,
    durationMs,
  }
}

function buildSummary(
  results: ValidationRunResult[],
  allPassed: boolean,
  totalErrors: number,
  totalWarnings: number
): string {
  if (results.length === 0) return 'No validation run'

  const lines = results.map(r => {
    const status = r.passed ? '✓' : '✗'
    const detail = r.passed
      ? (r.warningCount > 0 ? ` (${r.warningCount} warnings)` : '')
      : ` (${r.errorCount} errors)`
    return `${status} ${r.toolType}${detail}`
  })

  const statusLine = allPassed
    ? `All validation passed${totalWarnings > 0 ? ` with ${totalWarnings} warnings` : ''}`
    : `Validation failed: ${totalErrors} error${totalErrors !== 1 ? 's' : ''}`

  return `${statusLine}\n${lines.join('\n')}`
}

/**
 * Format validation report for display in chat.
 */
export function formatValidationForChat(report: ValidationReport): string {
  if (report.toolsRun.length === 0) {
    return '**Validation**: No tools detected — skipped'
  }

  const lines: string[] = [
    `**Validation** (${(report.durationMs / 1000).toFixed(1)}s)`,
    '',
  ]

  for (const result of report.toolsRun) {
    const icon = result.passed ? '✅' : '❌'
    const errors = result.errorCount > 0 ? ` — ${result.errorCount} error${result.errorCount !== 1 ? 's' : ''}` : ''
    const warns = result.warningCount > 0 ? ` — ${result.warningCount} warning${result.warningCount !== 1 ? 's' : ''}` : ''
    lines.push(`${icon} **${result.toolType}** \`${result.toolCommand}\`${errors}${warns}`)

    if (!result.passed && result.stderr) {
      const errSnippet = result.stderr.slice(0, 400)
      lines.push(`\`\`\`\n${errSnippet}${result.stderr.length > 400 ? '\n...' : ''}\n\`\`\``)
    }
  }

  if (!report.allPassed) {
    lines.push('')
    lines.push(`> **${report.totalErrors} error${report.totalErrors !== 1 ? 's' : ''} must be resolved before this change is safe.**`)
  }

  return lines.join('\n')
}
