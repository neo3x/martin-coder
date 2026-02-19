import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import Table from 'cli-table3'
import inquirer from 'inquirer'
import * as api from '../api.js'
import { loadConfig } from '../config.js'

// ─── List sessions ────────────────────────────────────────────────────────────

async function listSessionsCommand(): Promise<void> {
  const config = loadConfig()

  if (!config.accessToken) {
    console.log(chalk.yellow('Not logged in. Run `martin login` first.'))
    process.exit(1)
  }

  const spinner = ora('Fetching sessions...').start()

  try {
    const result = await api.listSessions()
    spinner.stop()

    if (result.items.length === 0) {
      console.log(chalk.dim('\nNo sessions found. Start one with `martin chat`.\n'))
      return
    }

    const table = new Table({
      head: [
        chalk.bold('ID'),
        chalk.bold('Title'),
        chalk.bold('Agent'),
        chalk.bold('Model'),
        chalk.bold('Msgs'),
        chalk.bold('Tokens'),
        chalk.bold('Cost'),
        chalk.bold('Updated'),
      ],
      colWidths: [38, 30, 8, 30, 6, 10, 10, 22],
      style: { head: [], border: [] },
    })

    for (const session of result.items) {
      const updatedAt = new Date(session.updatedAt).toLocaleString()
      table.push([
        chalk.dim(session.id),
        session.title.length > 28 ? session.title.slice(0, 25) + '...' : session.title,
        session.agentName,
        session.model.length > 28 ? session.model.slice(0, 25) + '...' : session.model,
        String(session.messageCount),
        String(session.totalTokens.toLocaleString()),
        `$${session.totalCost.toFixed(4)}`,
        updatedAt,
      ])
    }

    console.log()
    console.log(table.toString())
    console.log(
      chalk.dim(`\n  Showing ${result.items.length} of ${result.total} sessions.\n`),
    )
  } catch (err: any) {
    spinner.fail(chalk.red(`Failed to list sessions: ${err.message}`))
    process.exit(1)
  }
}

// ─── Delete session ───────────────────────────────────────────────────────────

async function deleteSessionCommand(id: string): Promise<void> {
  const config = loadConfig()

  if (!config.accessToken) {
    console.log(chalk.yellow('Not logged in. Run `martin login` first.'))
    process.exit(1)
  }

  // Fetch session to show its title
  let title = id
  try {
    const session = await api.getSession(id)
    title = session.title
  } catch {
    // Proceed with deletion even if we can't fetch the title
  }

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: `Delete session "${title}"? This cannot be undone.`,
      default: false,
    },
  ])

  if (!confirmed) {
    console.log(chalk.dim('Deletion cancelled.'))
    return
  }

  const spinner = ora('Deleting session...').start()

  try {
    await api.deleteSession(id)
    spinner.succeed(chalk.green(`Session deleted: ${title}`))
  } catch (err: any) {
    spinner.fail(chalk.red(`Failed to delete session: ${err.message}`))
    process.exit(1)
  }
}

// ─── Command registration ─────────────────────────────────────────────────────

export function registerSessionsCommands(program: Command): void {
  const sessions = program
    .command('sessions')
    .description('Manage chat sessions')
    .action(listSessionsCommand)

  sessions
    .command('delete <id>')
    .description('Delete a session by ID')
    .action(deleteSessionCommand)
}
