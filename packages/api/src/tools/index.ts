import { tool } from 'ai'
import { z } from 'zod'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs'
import { join, resolve, relative, dirname } from 'path'
import { execSync } from 'child_process'

// Security: blocked bash patterns
const BLOCKED_BASH_PATTERNS = [
  /rm\s+-rf\s+\/(?!\S)/,          // rm -rf /
  /rm\s+-rf\s+~\/?$/,             // rm -rf ~
  />\s*\/dev\/sd[a-z]/,           // writing to block devices
  /mkfs/,                          // format filesystem
  /dd\s+if=/,                      // dd command
  /:\(\)\s*\{.*\}/,               // fork bomb
  /chmod\s+-R\s+777\s+\//,       // chmod 777 /
  /chown\s+-R\s+.*\s+\//,        // chown /
  /passwd\s+root/,                 // change root password
  /sudo\s+rm\s+-rf/,              // sudo rm -rf
  /wget.*\|\s*bash/,              // wget | bash
  /curl.*\|\s*bash/,              // curl | bash
  /curl.*\|\s*sh/,                // curl | sh
  /python.*-c.*exec/,             // python exec
  /eval.*\$\(/,                   // eval $()
  /base64.*-d.*\|.*bash/,         // base64 decode | bash
  /nc\s+-l/,                      // netcat listen
  /ncat\s+-l/,                    // ncat listen
  /\/etc\/shadow/,                // access shadow file
  /\/etc\/passwd.*>/,             // overwrite passwd
  /crontab\s+-r/,                 // remove crontab
  /shutdown/,                      // shutdown
  /reboot/,                        // reboot
  /halt/,                          // halt
  /init\s+0/,                     // init 0
  /systemctl\s+(stop|disable)\s+/,// stop services
  /iptables\s+-F/,                // flush firewall rules
  /mount\s+/,                     // mount filesystems
  /umount\s+/,                    // unmount
  /fdisk/,                         // partition tool
  /parted/,                        // partition tool
  /lvremove/,                      // LVM remove
  /vgremove/,                      // LVM VG remove
  /wipefs/,                        // wipe filesystem signatures
]


export interface ToolExecutionContext {
  readOnlyMode: boolean
  requireApprovalForCommands: boolean
  writableRoots: string[]
  allowCommandPatterns: string[]
  denyCommandPatterns: string[]
}

const DEFAULT_TOOL_CONTEXT: ToolExecutionContext = {
  readOnlyMode: false,
  requireApprovalForCommands: true,
  writableRoots: [],
  allowCommandPatterns: [],
  denyCommandPatterns: [],
}

let activeToolContext: ToolExecutionContext = DEFAULT_TOOL_CONTEXT

export function setToolExecutionContext(context: ToolExecutionContext): void {
  activeToolContext = context
}

export function clearToolExecutionContext(): void {
  activeToolContext = DEFAULT_TOOL_CONTEXT
}

function canWriteToPath(targetPath: string): boolean {
  if (activeToolContext.writableRoots.length === 0) return true
  const resolved = resolve(targetPath)
  return activeToolContext.writableRoots.some((root) => resolved.startsWith(resolve(root)))
}

function assertWriteAllowed(targetPath: string): void {
  if (activeToolContext.readOnlyMode) {
    throw new Error('Session is in read-only mode. File modifications are blocked.')
  }

  if (!canWriteToPath(targetPath)) {
    throw new Error(`Write blocked outside allowed roots: ${targetPath}`)
  }
}

function assertCommandAllowed(command: string): void {
  const denyHit = activeToolContext.denyCommandPatterns.find((pattern) =>
    command.toLowerCase().includes(pattern.toLowerCase())
  )
  if (denyHit) {
    throw new Error(`Command blocked by deny pattern: ${denyHit}`)
  }

  if (activeToolContext.allowCommandPatterns.length > 0) {
    const allowed = activeToolContext.allowCommandPatterns.some((pattern) =>
      command.toLowerCase().includes(pattern.toLowerCase())
    )
    if (!allowed) {
      throw new Error('Command blocked because it does not match allowed command patterns.')
    }
  }

  if (activeToolContext.readOnlyMode) {
    const writeSignals = [
      ' rm ',
      'mv ',
      'cp ',
      'chmod ',
      'chown ',
      'sed -i',
      'tee ',
      '>>',
      '>',
      'git add',
      'git commit',
      'npm install',
      'bun install',
      'yarn add',
      'pnpm add',
      'touch ',
      'mkdir ',
    ]
    const normalized = ` ${command.toLowerCase()} `
    if (writeSignals.some((signal) => normalized.includes(signal))) {
      throw new Error('Session is in read-only mode. Write-like commands are blocked.')
    }
  }

  if (activeToolContext.requireApprovalForCommands) {
    throw new Error(
      'Command requires approval. Disable requireApprovalForCommands in session safety settings to execute bash commands.'
    )
  }
}

function validatePath(filePath: string, basePath?: string): string {
  const resolved = resolve(filePath)

  if (basePath) {
    const resolvedBase = resolve(basePath)
    if (!resolved.startsWith(resolvedBase)) {
      throw new Error(`Path traversal detected: ${filePath}`)
    }
  }

  // Block access to sensitive system paths
  const blockedPaths = ['/etc/shadow', '/etc/passwd', '/root/.ssh', '/home/.*/.ssh']
  for (const blocked of blockedPaths) {
    if (new RegExp(blocked).test(resolved)) {
      throw new Error(`Access to path is not allowed: ${filePath}`)
    }
  }

  return resolved
}

function validateBashCommand(command: string): void {
  for (const pattern of BLOCKED_BASH_PATTERNS) {
    if (pattern.test(command)) {
      throw new Error(`Blocked dangerous command pattern detected: ${command}`)
    }
  }
}

function listDirectoryRecursive(
  dirPath: string,
  pattern?: string,
  maxDepth = 5,
  currentDepth = 0
): string[] {
  if (currentDepth >= maxDepth) return []

  const results: string[] = []

  try {
    const entries = readdirSync(dirPath)

    for (const entry of entries) {
      // Skip hidden files and common ignore patterns
      if (entry.startsWith('.') && entry !== '.env.example') continue
      if (['node_modules', '.git', 'dist', 'build', '__pycache__', '.cache'].includes(entry))
        continue

      const fullPath = join(dirPath, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        results.push(`${fullPath}/`)
        results.push(...listDirectoryRecursive(fullPath, pattern, maxDepth, currentDepth + 1))
      } else {
        if (!pattern || new RegExp(pattern).test(entry)) {
          results.push(fullPath)
        }
      }
    }
  } catch {
    // Skip unreadable directories
  }

  return results
}

export const readFileTool = tool({
  description:
    'Read the contents of a file. Can optionally read a specific range of lines.',
  parameters: z.object({
    path: z.string().describe('Path to the file to read'),
    lineStart: z.number().optional().describe('Starting line number (1-indexed)'),
    lineEnd: z.number().optional().describe('Ending line number (1-indexed)'),
  }),
  execute: async ({ path, lineStart, lineEnd }) => {
    try {
      const validPath = validatePath(path)

      if (!existsSync(validPath)) {
        return { error: `File not found: ${path}` }
      }

      const content = readFileSync(validPath, 'utf-8')

      if (lineStart !== undefined || lineEnd !== undefined) {
        const lines = content.split('\n')
        const start = (lineStart || 1) - 1
        const end = lineEnd !== undefined ? lineEnd : lines.length
        const selectedLines = lines.slice(start, end)
        return {
          path: validPath,
          content: selectedLines.join('\n'),
          lineStart: start + 1,
          lineEnd: Math.min(end, lines.length),
          totalLines: lines.length,
        }
      }

      const lines = content.split('\n')
      return {
        path: validPath,
        content,
        totalLines: lines.length,
      }
    } catch (err) {
      return { error: String(err) }
    }
  },
})

export const writeFileTool = tool({
  description: 'Write content to a file, creating parent directories if needed.',
  parameters: z.object({
    path: z.string().describe('Path to write the file'),
    content: z.string().describe('Content to write to the file'),
  }),
  execute: async ({ path, content }) => {
    try {
      const validPath = validatePath(path)
      assertWriteAllowed(validPath)
      const dir = dirname(validPath)

      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      writeFileSync(validPath, content, 'utf-8')
      const lines = content.split('\n').length

      console.log(`[Tool] writeFile: ${validPath} (${lines} lines)`)
      return { success: true, path: validPath, lines }
    } catch (err) {
      return { error: String(err) }
    }
  },
})

export const editFileTool = tool({
  description:
    'Edit a file by replacing a specific string with a new string. The oldStr must match exactly.',
  parameters: z.object({
    path: z.string().describe('Path to the file to edit'),
    oldStr: z.string().describe('Exact string to find and replace'),
    newStr: z.string().describe('String to replace with'),
  }),
  execute: async ({ path, oldStr, newStr }) => {
    try {
      const validPath = validatePath(path)
      assertWriteAllowed(validPath)

      if (!existsSync(validPath)) {
        return { error: `File not found: ${path}` }
      }

      const content = readFileSync(validPath, 'utf-8')

      if (!content.includes(oldStr)) {
        return { error: `String not found in file: ${oldStr.slice(0, 50)}...` }
      }

      const newContent = content.replace(oldStr, newStr)
      writeFileSync(validPath, newContent, 'utf-8')

      console.log(`[Tool] editFile: ${validPath}`)
      return { success: true, path: validPath }
    } catch (err) {
      return { error: String(err) }
    }
  },
})

export const listDirectoryTool = tool({
  description: 'List the contents of a directory.',
  parameters: z.object({
    path: z.string().describe('Path to the directory to list'),
    recursive: z.boolean().optional().describe('Whether to list recursively'),
    pattern: z.string().optional().describe('Regex pattern to filter files'),
  }),
  execute: async ({ path, recursive, pattern }) => {
    try {
      const validPath = validatePath(path)

      if (!existsSync(validPath)) {
        return { error: `Directory not found: ${path}` }
      }

      const stat = statSync(validPath)
      if (!stat.isDirectory()) {
        return { error: `Path is not a directory: ${path}` }
      }

      if (recursive) {
        const files = listDirectoryRecursive(validPath, pattern)
        return { path: validPath, files, count: files.length }
      }

      const entries = readdirSync(validPath).map((entry) => {
        const fullPath = join(validPath, entry)
        const entryStat = statSync(fullPath)
        return {
          name: entry,
          path: fullPath,
          type: entryStat.isDirectory() ? 'directory' : 'file',
          size: entryStat.size,
          modified: entryStat.mtime.toISOString(),
        }
      })

      const filtered = pattern
        ? entries.filter((e) => new RegExp(pattern).test(e.name))
        : entries

      return { path: validPath, entries: filtered, count: filtered.length }
    } catch (err) {
      return { error: String(err) }
    }
  },
})

export const searchFilesTool = tool({
  description: 'Search for files matching a pattern in a directory.',
  parameters: z.object({
    pattern: z.string().describe('Search pattern (regex or glob-style)'),
    directory: z.string().optional().describe('Directory to search in (defaults to current dir)'),
    fileTypes: z.array(z.string()).optional().describe('File extensions to filter (e.g., [".ts", ".js"])'),
  }),
  execute: async ({ pattern, directory, fileTypes }) => {
    try {
      const searchDir = directory ? validatePath(directory) : process.cwd()

      if (!existsSync(searchDir)) {
        return { error: `Directory not found: ${directory}` }
      }

      const allFiles = listDirectoryRecursive(searchDir)
      const patternRegex = new RegExp(pattern, 'i')

      const matches = allFiles.filter((file) => {
        const matchesPattern = patternRegex.test(file)
        if (!matchesPattern) return false

        if (fileTypes && fileTypes.length > 0) {
          return fileTypes.some((ext) => file.endsWith(ext))
        }

        return true
      })

      return { pattern, directory: searchDir, matches, count: matches.length }
    } catch (err) {
      return { error: String(err) }
    }
  },
})

export const executeBashTool = tool({
  description:
    'Execute a bash command. Use with caution - dangerous commands are blocked.',
  parameters: z.object({
    command: z.string().describe('Bash command to execute'),
    cwd: z.string().optional().describe('Working directory for the command'),
    timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)'),
  }),
  execute: async ({ command, cwd, timeout = 30000 }) => {
    try {
      validateBashCommand(command)
      assertCommandAllowed(command)

      const workingDir = cwd ? validatePath(cwd) : process.cwd()

      console.log(`[Tool] executeBash: ${command} (cwd: ${workingDir})`)

      const output = execSync(command, {
        cwd: workingDir,
        timeout,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB
      })

      return { success: true, stdout: output, stderr: '', exitCode: 0 }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'stdout' in err) {
        const execErr = err as { stdout: Buffer | string; stderr: Buffer | string; status: number }
        return {
          success: false,
          stdout: execErr.stdout?.toString() || '',
          stderr: execErr.stderr?.toString() || String(err),
          exitCode: execErr.status || 1,
        }
      }
      return { success: false, stdout: '', stderr: String(err), exitCode: 1 }
    }
  },
})

export const installDependenciesTool = tool({
  description: 'Install packages using a package manager.',
  parameters: z.object({
    packages: z.array(z.string()).describe('Package names to install'),
    packageManager: z
      .enum(['npm', 'yarn', 'pnpm', 'bun'])
      .optional()
      .describe('Package manager to use (default: bun)'),
  }),
  execute: async ({ packages, packageManager = 'bun' }) => {
    try {
      const installCmd = packageManager === 'yarn' ? 'add' : 'install'
      const command = `${packageManager} ${installCmd} ${packages.join(' ')}`

      validateBashCommand(command)

      console.log(`[Tool] installDependencies: ${command}`)

      const output = execSync(command, {
        cwd: process.cwd(),
        timeout: 120000,
        encoding: 'utf-8',
      })

      return { success: true, packages, packageManager, output }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'stderr' in err) {
        const execErr = err as { stderr: Buffer | string }
        return { success: false, error: execErr.stderr?.toString() || String(err) }
      }
      return { success: false, error: String(err) }
    }
  },
})

export const gitStatusTool = tool({
  description: 'Get the git status of a repository.',
  parameters: z.object({
    repoPath: z.string().describe('Path to the git repository'),
  }),
  execute: async ({ repoPath }) => {
    try {
      const validPath = validatePath(repoPath)
      const output = execSync('git status --porcelain', {
        cwd: validPath,
        encoding: 'utf-8',
      })

      const branch = execSync('git branch --show-current', {
        cwd: validPath,
        encoding: 'utf-8',
      }).trim()

      const lines = output.trim().split('\n').filter(Boolean)
      const files = lines.map((line) => ({
        status: line.slice(0, 2).trim(),
        path: line.slice(3),
      }))

      return { branch, files, clean: files.length === 0 }
    } catch (err) {
      return { error: String(err) }
    }
  },
})

export const gitDiffTool = tool({
  description: 'Get git diff for a repository.',
  parameters: z.object({
    repoPath: z.string().describe('Path to the git repository'),
    staged: z.boolean().optional().describe('Show staged changes (default: unstaged)'),
  }),
  execute: async ({ repoPath, staged = false }) => {
    try {
      const validPath = validatePath(repoPath)
      const command = staged ? 'git diff --staged' : 'git diff'
      const output = execSync(command, {
        cwd: validPath,
        encoding: 'utf-8',
      })

      return { diff: output, staged }
    } catch (err) {
      return { error: String(err) }
    }
  },
})

export const gitCommitTool = tool({
  description: 'Create a git commit.',
  parameters: z.object({
    repoPath: z.string().describe('Path to the git repository'),
    message: z.string().describe('Commit message'),
    files: z.array(z.string()).optional().describe('Specific files to add (default: all)'),
  }),
  execute: async ({ repoPath, message, files }) => {
    try {
      const validPath = validatePath(repoPath)

      if (files && files.length > 0) {
        execSync(`git add ${files.map((f) => `"${f}"`).join(' ')}`, {
          cwd: validPath,
          encoding: 'utf-8',
        })
      } else {
        execSync('git add -A', { cwd: validPath, encoding: 'utf-8' })
      }

      const output = execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
        cwd: validPath,
        encoding: 'utf-8',
      })

      console.log(`[Tool] gitCommit: ${validPath} - ${message}`)
      return { success: true, output }
    } catch (err) {
      return { error: String(err) }
    }
  },
})

export const gitLogTool = tool({
  description: 'Get git log for a repository.',
  parameters: z.object({
    repoPath: z.string().describe('Path to the git repository'),
    limit: z.number().optional().describe('Number of commits to show (default: 10)'),
  }),
  execute: async ({ repoPath, limit = 10 }) => {
    try {
      const validPath = validatePath(repoPath)
      const output = execSync(
        `git log --oneline --no-walk=unsorted -${limit} --format="%H|%an|%ae|%ai|%s"`,
        {
          cwd: validPath,
          encoding: 'utf-8',
        }
      )

      const commits = output
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, author, email, date, ...messageParts] = line.split('|')
          return { hash, author, email, date, message: messageParts.join('|') }
        })

      return { commits }
    } catch (err) {
      return { error: String(err) }
    }
  },
})

export const codeSearchTool = tool({
  description: 'Search for code patterns in files using grep-style search.',
  parameters: z.object({
    query: z.string().describe('Search query (regex supported)'),
    directory: z.string().optional().describe('Directory to search in'),
    language: z.string().optional().describe('Language filter (e.g., "typescript", "python")'),
  }),
  execute: async ({ query, directory, language }) => {
    try {
      const searchDir = directory ? validatePath(directory) : process.cwd()

      const langExtensions: Record<string, string[]> = {
        typescript: ['ts', 'tsx'],
        javascript: ['js', 'jsx', 'mjs', 'cjs'],
        python: ['py'],
        rust: ['rs'],
        go: ['go'],
        java: ['java'],
        cpp: ['cpp', 'cc', 'cxx', 'h', 'hpp'],
        c: ['c', 'h'],
        ruby: ['rb'],
        php: ['php'],
        swift: ['swift'],
        kotlin: ['kt'],
      }

      let includeArg = ''
      if (language && langExtensions[language.toLowerCase()]) {
        const exts = langExtensions[language.toLowerCase()]
        includeArg = exts.map((e) => `--include="*.${e}"`).join(' ')
      }

      const command = `grep -rn ${includeArg} --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist -E "${query.replace(/"/g, '\\"')}" "${searchDir}" 2>/dev/null | head -100`

      const output = execSync(command, {
        encoding: 'utf-8',
        timeout: 10000,
      })

      const results = output
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const match = line.match(/^(.+):(\d+):(.*)$/)
          if (match) {
            return { file: match[1], line: parseInt(match[2]), content: match[3].trim() }
          }
          return { file: line, line: 0, content: line }
        })

      return { query, directory: searchDir, results, count: results.length }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err) {
        const execErr = err as { status: number; stdout: Buffer | string }
        if (execErr.status === 1) {
          return { query, directory: directory || process.cwd(), results: [], count: 0 }
        }
      }
      return { error: String(err) }
    }
  },
})

export const webSearchTool = tool({
  description: 'Search the web for information.',
  parameters: z.object({
    query: z.string().describe('Search query'),
  }),
  execute: async ({ query }) => {
    // Web search would require an API key (e.g., Brave, Serper, Tavily)
    // For now we return a placeholder that can be configured
    const searchApiKey = process.env.SEARCH_API_KEY
    const searchProvider = process.env.SEARCH_PROVIDER || 'tavily'

    if (!searchApiKey) {
      return {
        query,
        results: [],
        message: 'Web search requires SEARCH_API_KEY environment variable',
      }
    }

    try {
      if (searchProvider === 'tavily') {
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${searchApiKey}`,
          },
          body: JSON.stringify({ query, max_results: 5 }),
        })

        const data = (await response.json()) as {
          results?: Array<{ title: string; url: string; content: string }>
        }
        return {
          query,
          results:
            data.results?.map((r) => ({
              title: r.title,
              url: r.url,
              snippet: r.content,
            })) || [],
        }
      }

      return { query, results: [], message: `Unsupported search provider: ${searchProvider}` }
    } catch (err) {
      return { error: String(err), query }
    }
  },
})

export const ALL_TOOLS = {
  readFile: readFileTool,
  writeFile: writeFileTool,
  editFile: editFileTool,
  listDirectory: listDirectoryTool,
  searchFiles: searchFilesTool,
  executeBash: executeBashTool,
  installDependencies: installDependenciesTool,
  gitStatus: gitStatusTool,
  gitDiff: gitDiffTool,
  gitCommit: gitCommitTool,
  gitLog: gitLogTool,
  codeSearch: codeSearchTool,
  webSearch: webSearchTool,
}

export type ToolName = keyof typeof ALL_TOOLS

export function getToolsForAgent(allowedToolNames: string[]): Record<string, typeof ALL_TOOLS[ToolName]> {
  const result: Partial<typeof ALL_TOOLS> = {}

  for (const name of allowedToolNames) {
    if (name in ALL_TOOLS) {
      result[name as ToolName] = ALL_TOOLS[name as ToolName]
    }
  }

  return result as Record<string, typeof ALL_TOOLS[ToolName]>
}
