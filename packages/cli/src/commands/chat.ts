import { Command } from 'commander'
import inquirer from 'inquirer'
import chalk from 'chalk'
import ora from 'ora'
import * as readline from 'readline'
import type { Session, StreamEvent, ToolCall, ToolResult } from '@martin-coder/shared'
import { AGENT_NAMES } from '@martin-coder/shared'
import * as api from '../api.js'
import { loadConfig } from '../config.js'

// ─── Stream output rendering ──────────────────────────────────────────────────

function renderStreamEvent(event: StreamEvent): void {
  switch (event.type) {
    case 'text-delta':
      process.stdout.write(event.textDelta)
      break

    case 'tool-call': {
      const tc: ToolCall = event.toolCall
      const argsStr = JSON.stringify(tc.arguments)
      const truncated = argsStr.length > 120 ? argsStr.slice(0, 117) + '...' : argsStr
      process.stdout.write(chalk.gray(`\n  ▶ ${tc.name}(${truncated})`))
      break
    }

    case 'tool-result': {
      const tr: ToolResult = event.toolResult
      if (tr.error) {
        process.stdout.write(chalk.red(`\n  ✗ ${tr.error}`))
      } else {
        const resultStr =
          typeof tr.result === 'string'
            ? tr.result
            : JSON.stringify(tr.result)
        const truncated = resultStr.length > 200 ? resultStr.slice(0, 197) + '...' : resultStr
        process.stdout.write(chalk.green(`\n  ✓ ${truncated}`))
      }
      break
    }

    case 'finish': {
      const { usage, cost } = event
      process.stdout.write('\n')
      console.log(
        chalk.dim(
          `\n  [${usage.promptTokens}+${usage.completionTokens}=${usage.totalTokens} tokens | $${cost.toFixed(6)}]`,
        ),
      )
      break
    }

    case 'error':
      process.stdout.write('\n')
      console.error(chalk.red(`\nError: ${event.error}`))
      break
  }
}

// ─── Session selection ────────────────────────────────────────────────────────

async function selectOrCreateSession(
  forceNew: boolean,
  sessionId: string | undefined,
): Promise<Session> {
  const config = loadConfig()

  // Continue a specific session
  if (sessionId) {
    const spinner = ora('Loading session...').start()
    try {
      const session = await api.getSession(sessionId)
      spinner.succeed(`Session loaded: ${chalk.bold(session.title)}`)
      return session
    } catch (err: any) {
      spinner.fail(`Failed to load session: ${err.message}`)
      process.exit(1)
    }
  }

  // Force new session – skip listing
  if (forceNew) {
    return createNewSession(config)
  }

  // List existing sessions and offer choice
  const spinner = ora('Fetching sessions...').start()
  let sessions: Session[] = []

  try {
    const result = await api.listSessions()
    sessions = result.items
    spinner.stop()
  } catch {
    spinner.stop()
    // If listing fails, fall through to creating new
  }

  if (sessions.length === 0) {
    console.log(chalk.dim('No existing sessions found. Creating a new one.\n'))
    return createNewSession(config)
  }

  const choices = [
    { name: chalk.green('+ New session'), value: '__new__' },
    ...sessions.map((s) => ({
      name: `${s.title} ${chalk.dim(`[${s.agentName}] ${s.messageCount} msgs`)}`,
      value: s.id,
    })),
  ]

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Select a session:',
      choices,
    },
  ])

  if (choice === '__new__') {
    return createNewSession(config)
  }

  const session = sessions.find((s) => s.id === choice)!
  return session
}

async function createNewSession(config: ReturnType<typeof loadConfig>): Promise<Session> {
  // Gather session options
  let agentChoices: Array<{ name: string; value: string }> = []

  try {
    const agents = await api.listAgents()
    agentChoices = agents.map((a) => ({
      name: `${a.displayName} – ${a.description}`,
      value: a.name,
    }))
  } catch {
    agentChoices = [
      { name: 'Build Agent – Full coding agent with file/terminal access', value: 'build' },
      { name: 'Plan Agent – Read-only planning and analysis', value: 'plan' },
    ]
  }

  let modelChoices: Array<{ name: string; value: string }> = []
  try {
    const providers = await api.listProviders()
    for (const p of providers) {
      if (p.isAvailable) {
        for (const m of p.models) {
          modelChoices.push({ name: `${p.displayName} / ${m.name}`, value: m.id })
        }
      }
    }
  } catch {
    modelChoices = [{ name: config.defaultModel, value: config.defaultModel }]
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'Session title:',
      default: `Session ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    },
    {
      type: 'list',
      name: 'agentName',
      message: 'Agent:',
      choices: agentChoices,
      default: config.defaultAgent,
    },
    {
      type: 'list',
      name: 'model',
      message: 'Model:',
      choices: modelChoices,
      default: config.defaultModel,
    },
  ])

  const spinner = ora('Creating session...').start()
  try {
    const session = await api.createSession({
      title: answers.title,
      agentName: answers.agentName,
      model: answers.model,
    })
    spinner.succeed(`Session created: ${chalk.bold(session.title)}`)
    return session
  } catch (err: any) {
    spinner.fail(`Failed to create session: ${err.message}`)
    process.exit(1)
  }
}

// ─── REPL loop ────────────────────────────────────────────────────────────────

async function runChatRepl(session: Session): Promise<void> {
  console.log()
  console.log(
    chalk.bold.blue('──────────────────────────────────────────────────────────'),
  )
  console.log(
    chalk.bold(` Martin Coder – ${session.title}`),
  )
  console.log(
    chalk.dim(` Agent: ${session.agentName}  |  Model: ${session.model}  |  Session ID: ${session.id}`),
  )
  console.log(
    chalk.bold.blue('──────────────────────────────────────────────────────────'),
  )
  console.log(chalk.dim(' Type your message and press Enter. Ctrl+C to exit.\n'))

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  })

  // Graceful exit on Ctrl+C
  rl.on('SIGINT', () => {
    console.log(chalk.dim('\n\nGoodbye!'))
    rl.close()
    process.exit(0)
  })

  const prompt = (): Promise<string> =>
    new Promise((resolve) => {
      rl.question(chalk.cyan('\nyou> '), (answer) => {
        resolve(answer)
      })
    })

  while (true) {
    let userInput: string
    try {
      userInput = await prompt()
    } catch {
      // readline closed
      break
    }

    const trimmed = userInput.trim()
    if (!trimmed) continue

    // Built-in REPL commands
    if (trimmed === '/exit' || trimmed === '/quit') {
      console.log(chalk.dim('\nGoodbye!'))
      rl.close()
      process.exit(0)
    }

    if (trimmed === '/session') {
      console.log(chalk.dim(`\nSession ID: ${session.id}`))
      console.log(chalk.dim(`Title:      ${session.title}`))
      console.log(chalk.dim(`Agent:      ${session.agentName}`))
      console.log(chalk.dim(`Model:      ${session.model}`))
      console.log(chalk.dim(`Messages:   ${session.messageCount}`))
      continue
    }

    if (trimmed === '/help') {
      console.log(chalk.dim('\nBuilt-in commands:'))
      console.log(chalk.dim('  /session  – show session info'))
      console.log(chalk.dim('  /help     – show this help'))
      console.log(chalk.dim('  /exit     – exit the chat'))
      continue
    }

    process.stdout.write(chalk.bold.green('\nmartin> '))

    try {
      await api.sendMessage(session.id, trimmed, undefined, renderStreamEvent)
    } catch (err: any) {
      console.error(chalk.red(`\nError: ${err.message}`))
      if (err.statusCode === 401) {
        console.log(chalk.dim('Session expired. Run `martin login` to re-authenticate.'))
        rl.close()
        process.exit(1)
      }
    }

    process.stdout.write('\n')
  }

  rl.close()
}

// ─── Command handler ──────────────────────────────────────────────────────────

async function chatCommand(options: { session?: string; new?: boolean }): Promise<void> {
  const config = loadConfig()

  if (!config.accessToken) {
    console.log(chalk.yellow('Not logged in. Run `martin login` first.'))
    process.exit(1)
  }

  const session = await selectOrCreateSession(options.new ?? false, options.session)
  await runChatRepl(session)
}

// ─── Command registration ─────────────────────────────────────────────────────

export function registerChatCommands(program: Command): void {
  program
    .command('chat')
    .description('Start an interactive chat session (REPL)')
    .option('-s, --session <id>', 'Continue an existing session by ID')
    .option('-n, --new', 'Force creation of a new session')
    .action(chatCommand)
}
