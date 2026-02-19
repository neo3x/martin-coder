import { Command } from 'commander'
import inquirer from 'inquirer'
import chalk from 'chalk'
import ora from 'ora'
import * as api from '../api.js'
import { saveConfig, clearConfig, loadConfig } from '../config.js'

// ─── login ────────────────────────────────────────────────────────────────────

async function loginCommand(): Promise<void> {
  console.log(chalk.bold('\nMartin Coder – Login\n'))

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Email:',
      validate: (v: string) => (v.includes('@') ? true : 'Please enter a valid email'),
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
      mask: '*',
      validate: (v: string) => (v.length >= 1 ? true : 'Password cannot be empty'),
    },
  ])

  const spinner = ora('Logging in...').start()

  try {
    const result = await api.login(answers.email, answers.password)
    saveConfig({
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
    })
    spinner.succeed(chalk.green('Logged in successfully'))

    // Fetch and display user info
    const user = await api.me()
    console.log(chalk.dim(`  Logged in as: ${user.username} <${user.email}>`))
  } catch (err: any) {
    spinner.fail(chalk.red(`Login failed: ${err.message}`))
    process.exit(1)
  }
}

// ─── logout ───────────────────────────────────────────────────────────────────

async function logoutCommand(): Promise<void> {
  const spinner = ora('Logging out...').start()

  try {
    await api.logout()
  } catch {
    // Ignore API errors – clear locally regardless
  }

  clearConfig()
  spinner.succeed(chalk.green('Logged out successfully'))
}

// ─── whoami ───────────────────────────────────────────────────────────────────

async function whoamiCommand(): Promise<void> {
  const config = loadConfig()

  if (!config.accessToken) {
    console.log(chalk.yellow('Not logged in. Run `martin login` to authenticate.'))
    process.exit(1)
  }

  const spinner = ora('Fetching user info...').start()

  try {
    const user = await api.me()
    spinner.stop()
    console.log()
    console.log(chalk.bold('Current user:'))
    console.log(`  ${chalk.dim('Username:')}   ${user.username}`)
    console.log(`  ${chalk.dim('Email:')}      ${user.email}`)
    console.log(`  ${chalk.dim('Full name:')}  ${user.fullName ?? chalk.italic('(not set)')}`)
    console.log(`  ${chalk.dim('Role:')}       ${user.isSuperuser ? chalk.red('admin') : 'user'}`)
    console.log(`  ${chalk.dim('Verified:')}   ${user.isVerified ? chalk.green('yes') : chalk.yellow('no')}`)
    console.log(`  ${chalk.dim('Active:')}     ${user.isActive ? chalk.green('yes') : chalk.red('no')}`)
    console.log(`  ${chalk.dim('Provider:')}   ${user.defaultProvider}`)
    console.log(`  ${chalk.dim('Model:')}      ${user.defaultModel}`)
    console.log()
  } catch (err: any) {
    spinner.fail(chalk.red(`Failed to fetch user: ${err.message}`))
    if (err.statusCode === 401) {
      console.log(chalk.dim('Your session may have expired. Run `martin login` to re-authenticate.'))
    }
    process.exit(1)
  }
}

// ─── register ────────────────────────────────────────────────────────────────

async function registerCommand(): Promise<void> {
  console.log(chalk.bold('\nMartin Coder – Register\n'))

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Email:',
      validate: (v: string) => (v.includes('@') ? true : 'Please enter a valid email'),
    },
    {
      type: 'input',
      name: 'username',
      message: 'Username:',
      validate: (v: string) => (v.length >= 3 ? true : 'Username must be at least 3 characters'),
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
      mask: '*',
      validate: (v: string) => (v.length >= 8 ? true : 'Password must be at least 8 characters'),
    },
    {
      type: 'password',
      name: 'confirmPassword',
      message: 'Confirm password:',
      mask: '*',
      validate: (v: string, answers: any) =>
        v === answers.password ? true : 'Passwords do not match',
    },
  ])

  const spinner = ora('Creating account...').start()

  try {
    const user = await api.register(answers.email, answers.password, answers.username)
    spinner.succeed(chalk.green(`Account created: ${user.username} <${user.email}>`))
    console.log(chalk.dim('\nRun `martin login` to authenticate.\n'))
  } catch (err: any) {
    spinner.fail(chalk.red(`Registration failed: ${err.message}`))
    process.exit(1)
  }
}

// ─── Command registration ─────────────────────────────────────────────────────

export function registerAuthCommands(program: Command): void {
  program
    .command('login')
    .description('Log in to Martin Coder')
    .action(loginCommand)

  program
    .command('logout')
    .description('Log out and clear stored credentials')
    .action(logoutCommand)

  program
    .command('whoami')
    .description('Show the currently authenticated user')
    .action(whoamiCommand)

  program
    .command('register')
    .description('Create a new Martin Coder account')
    .action(registerCommand)
}
