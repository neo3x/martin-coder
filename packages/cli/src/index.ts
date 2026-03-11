#!/usr/bin/env bun
import { Command } from 'commander'
import chalk from 'chalk'
import { createRequire } from 'module'
import { registerAuthCommands } from './commands/auth.js'
import { registerChatCommands } from './commands/chat.js'
import { registerSessionsCommands } from './commands/sessions.js'
import { registerProjectsCommands } from './commands/projects.js'
import { registerConfigCommands } from './commands/config.js'
import { registerDoctorCommands } from './commands/doctor.js'

// ─── Resolve package version ──────────────────────────────────────────────────

function getVersion(): string {
  try {
    // Works when running via bun directly
    const require = createRequire(import.meta.url)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../package.json') as { version: string }
    return pkg.version
  } catch {
    return '2.0.0'
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const program = new Command()

program
  .name('martin')
  .description('Martin Coder – AI-powered coding assistant CLI')
  .version(getVersion(), '-v, --version', 'Print version number')
  .addHelpText(
    'after',
    `
${chalk.bold('Examples:')}
  ${chalk.cyan('martin login')}               Log in to Martin Coder
  ${chalk.cyan('martin chat')}                Start an interactive chat session
  ${chalk.cyan('martin chat --new')}          Force a new session
  ${chalk.cyan('martin chat -s <id>')}        Continue an existing session
  ${chalk.cyan('martin sessions')}            List all sessions
  ${chalk.cyan('martin sessions delete <id>')} Delete a session
  ${chalk.cyan('martin projects')}            List all projects
  ${chalk.cyan('martin projects create')}     Create a new project
  ${chalk.cyan('martin projects analyze <id>')} Analyze a project
  ${chalk.cyan('martin config')}              Show current configuration
  ${chalk.cyan('martin doctor')}              Run API and config diagnostics
  ${chalk.cyan('martin config set apiUrl http://localhost:8000')}
  ${chalk.cyan('martin whoami')}              Show the current user
  ${chalk.cyan('martin logout')}              Log out

${chalk.bold('Documentation:')}
  https://github.com/martin-coder/martin-coder
`,
  )

// ─── Register all command groups ──────────────────────────────────────────────

registerAuthCommands(program)
registerChatCommands(program)
registerSessionsCommands(program)
registerProjectsCommands(program)
registerConfigCommands(program)
registerDoctorCommands(program)

// ─── Global error handling ────────────────────────────────────────────────────

program.configureOutput({
  writeErr: (str) => process.stderr.write(chalk.red(str)),
})

process.on('uncaughtException', (err) => {
  console.error(chalk.red(`Unexpected error: ${err.message}`))
  if (process.env['DEBUG']) {
    console.error(err.stack)
  }
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason)
  console.error(chalk.red(`Unexpected error: ${message}`))
  if (process.env['DEBUG'] && reason instanceof Error) {
    console.error(reason.stack)
  }
  process.exit(1)
})

// ─── Parse arguments ──────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(chalk.red(`Error: ${err.message}`))
  process.exit(1)
})
