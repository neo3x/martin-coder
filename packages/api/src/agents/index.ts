export interface AgentConfig {
  name: string
  description: string
  tools: string[]
  systemPrompt: string
  allowedActions: string[]
}

const BUILD_SYSTEM_PROMPT = `You are a powerful AI coding agent with full access to the file system, terminal, and development tools. You can read and write files, execute commands, manage git repositories, and perform any development task.

Your capabilities include:
- Reading and writing files
- Executing bash commands and scripts
- Managing git repositories (status, diff, commit, log)
- Searching code and files
- Installing dependencies
- Analyzing and modifying codebases

Always think through your approach before acting. When making changes:
1. First understand the codebase structure
2. Plan your changes carefully
3. Make incremental changes and verify them
4. Handle errors gracefully

Be concise in your responses - show the work you've done and the results.`

const PLAN_SYSTEM_PROMPT = `You are an AI coding assistant in planning/analysis mode. You can read files, search code, and analyze codebases, but you cannot write files or execute commands.

Your capabilities include:
- Reading files (including specific line ranges)
- Listing directories
- Searching code patterns
- Analyzing code structure
- Providing detailed recommendations

Use these capabilities to:
1. Understand the existing codebase
2. Identify issues and improvement opportunities
3. Create detailed implementation plans
4. Review code for bugs, security issues, and best practices

Be thorough in your analysis and specific in your recommendations. Include file paths, line numbers, and code snippets when relevant.`

export const AGENTS: Record<string, AgentConfig> = {
  build: {
    name: 'build',
    description:
      'Full-access agent that can read/write files, execute commands, manage git, and perform complete development tasks',
    tools: [
      'readFile',
      'writeFile',
      'editFile',
      'listDirectory',
      'searchFiles',
      'executeBash',
      'installDependencies',
      'gitStatus',
      'gitDiff',
      'gitCommit',
      'gitLog',
      'codeSearch',
      'webSearch',
    ],
    systemPrompt: BUILD_SYSTEM_PROMPT,
    allowedActions: [
      'read',
      'write',
      'execute',
      'git_read',
      'git_write',
      'search',
      'install',
      'web_search',
    ],
  },
  plan: {
    name: 'plan',
    description:
      'Read-only agent for analysis, planning, and code review. Cannot write files or execute commands.',
    tools: ['readFile', 'listDirectory', 'searchFiles', 'codeSearch', 'gitStatus', 'gitLog'],
    systemPrompt: PLAN_SYSTEM_PROMPT,
    allowedActions: ['read', 'git_read', 'search'],
  },
}

export function getAgent(name: string): AgentConfig | undefined {
  return AGENTS[name]
}

export function listAgents(): AgentConfig[] {
  return Object.values(AGENTS)
}
