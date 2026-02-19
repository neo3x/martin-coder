import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { loadConfig, saveConfig, clearConfig, getConfigPath } from '../config.js'
import type { CliConfig } from '../config.js'

// ─── Allowed config keys ───────────────────────────────────────────────────────

const SETTABLE_KEYS: Array<keyof CliConfig> = [
  'apiUrl',
  'defaultProvider',
  'defaultModel',
  'defaultAgent',
]

// ─── Show config ──────────────────────────────────────────────────────────────

function showConfigCommand(): void {
  const config = loadConfig()

  console.log()
  console.log(chalk.bold('Current configuration:'))
  console.log(chalk.dim(`  File: ${getConfigPath()}\n`))

  const rows: Array<[string, string]> = [
    ['apiUrl', config.apiUrl],
    ['defaultProvider', config.defaultProvider],
    ['defaultModel', config.defaultModel],
    ['defaultAgent', config.defaultAgent],
    ['accessToken', config.accessToken ? chalk.green('(set)') : chalk.dim('(not set)')],
    ['refreshToken', config.refreshToken ? chalk.green('(set)') : chalk.dim('(not set)')],
  ]

  for (const [key, value] of rows) {
    const keyPadded = key.padEnd(20)
    console.log(`  ${chalk.bold(keyPadded)} ${value}`)
  }

  console.log()
}

// ─── Set config value ─────────────────────────────────────────────────────────

function setConfigCommand(key: string, value: string): void {
  if (!SETTABLE_KEYS.includes(key as keyof CliConfig)) {
    console.log(
      chalk.red(`Unknown or non-settable key: ${key}`),
    )
    console.log(chalk.dim(`  Settable keys: ${SETTABLE_KEYS.join(', ')}`))
    process.exit(1)
  }

  saveConfig({ [key]: value } as Partial<CliConfig>)
  console.log(chalk.green(`  ${key} = ${value}`))
}

// ─── Reset config ─────────────────────────────────────────────────────────────

async function resetConfigCommand(): Promise<void> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Clear all configuration including stored tokens? You will need to log in again.',
      default: false,
    },
  ])

  if (!confirmed) {
    console.log(chalk.dim('Reset cancelled.'))
    return
  }

  clearConfig()
  console.log(chalk.green('Configuration cleared.'))
}

// ─── Command registration ─────────────────────────────────────────────────────

export function registerConfigCommands(program: Command): void {
  const config = program
    .command('config')
    .description('View and manage CLI configuration')
    .action(showConfigCommand)

  config
    .command('set <key> <value>')
    .description(`Set a configuration value (keys: ${SETTABLE_KEYS.join(', ')})`)
    .action(setConfigCommand)

  config
    .command('reset')
    .description('Clear all configuration and stored tokens')
    .action(resetConfigCommand)
}
