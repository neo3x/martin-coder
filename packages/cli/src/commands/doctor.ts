import { Command } from 'commander'
import chalk from 'chalk'
import { loadConfig } from '../config.js'

export function registerDoctorCommands(program: Command): void {
  program
    .command('doctor')
    .description('Run local diagnostics for MartinCoder CLI and API connectivity')
    .action(async () => {
      const config = loadConfig()
      console.log(chalk.bold('\nMartinCoder Doctor\n'))
      console.log(`API URL: ${config.apiUrl}`)
      console.log(`Token: ${config.accessToken ? chalk.green('configured') : chalk.yellow('missing')}`)

      try {
        const res = await fetch(`${config.apiUrl}/health`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        console.log(chalk.green('✓ API health endpoint reachable'))
      } catch (error) {
        console.log(chalk.red(`✗ API health check failed: ${error instanceof Error ? error.message : String(error)}`))
      }

      console.log('')
    })
}
