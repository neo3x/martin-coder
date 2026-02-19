import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import Table from 'cli-table3'
import inquirer from 'inquirer'
import * as api from '../api.js'
import { loadConfig } from '../config.js'

// ─── List projects ────────────────────────────────────────────────────────────

async function listProjectsCommand(): Promise<void> {
  const config = loadConfig()

  if (!config.accessToken) {
    console.log(chalk.yellow('Not logged in. Run `martin login` first.'))
    process.exit(1)
  }

  const spinner = ora('Fetching projects...').start()

  try {
    const result = await api.listProjects()
    spinner.stop()

    if (result.items.length === 0) {
      console.log(chalk.dim('\nNo projects found. Create one with `martin projects create`.\n'))
      return
    }

    const table = new Table({
      head: [
        chalk.bold('ID'),
        chalk.bold('Name'),
        chalk.bold('Language'),
        chalk.bold('Framework'),
        chalk.bold('Indexed'),
        chalk.bold('Created'),
      ],
      colWidths: [38, 24, 14, 16, 9, 22],
      style: { head: [], border: [] },
    })

    for (const p of result.items) {
      table.push([
        chalk.dim(p.id),
        p.name.length > 22 ? p.name.slice(0, 19) + '...' : p.name,
        p.detectedLanguage ?? chalk.dim('—'),
        p.detectedFramework ?? chalk.dim('—'),
        p.isIndexed ? chalk.green('yes') : chalk.yellow('no'),
        new Date(p.createdAt).toLocaleDateString(),
      ])
    }

    console.log()
    console.log(table.toString())
    console.log(chalk.dim(`\n  Showing ${result.items.length} of ${result.total} projects.\n`))
  } catch (err: any) {
    spinner.fail(chalk.red(`Failed to list projects: ${err.message}`))
    process.exit(1)
  }
}

// ─── Create project ───────────────────────────────────────────────────────────

async function createProjectCommand(): Promise<void> {
  const config = loadConfig()

  if (!config.accessToken) {
    console.log(chalk.yellow('Not logged in. Run `martin login` first.'))
    process.exit(1)
  }

  console.log(chalk.bold('\nCreate a new project\n'))

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      validate: (v: string) => (v.trim().length >= 1 ? true : 'Name cannot be empty'),
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description (optional):',
    },
    {
      type: 'input',
      name: 'localPath',
      message: 'Local path (optional):',
    },
    {
      type: 'input',
      name: 'gitUrl',
      message: 'Git URL (optional):',
    },
    {
      type: 'input',
      name: 'gitBranch',
      message: 'Git branch (optional, defaults to main):',
    },
  ])

  const data: api.CreateProjectData = {
    name: answers.name.trim(),
  }
  if (answers.description.trim()) data.description = answers.description.trim()
  if (answers.localPath.trim()) data.localPath = answers.localPath.trim()
  if (answers.gitUrl.trim()) data.gitUrl = answers.gitUrl.trim()
  if (answers.gitBranch.trim()) data.gitBranch = answers.gitBranch.trim()

  const spinner = ora('Creating project...').start()

  try {
    const project = await api.createProject(data)
    spinner.succeed(chalk.green(`Project created: ${project.name} (${project.id})`))

    const { shouldAnalyze } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldAnalyze',
        message: 'Analyze project now?',
        default: true,
      },
    ])

    if (shouldAnalyze) {
      await analyzeProjectById(project.id)
    }
  } catch (err: any) {
    spinner.fail(chalk.red(`Failed to create project: ${err.message}`))
    process.exit(1)
  }
}

// ─── Analyze project ──────────────────────────────────────────────────────────

async function analyzeProjectById(id: string): Promise<void> {
  const spinner = ora('Analyzing project...').start()

  try {
    const result = await api.analyzeProject(id)
    spinner.succeed(chalk.green(result.message))

    const p = result.project
    console.log()
    if (p.detectedLanguage) {
      console.log(`  ${chalk.dim('Language:')}   ${p.detectedLanguage}`)
    }
    if (p.detectedFramework) {
      console.log(`  ${chalk.dim('Framework:')}  ${p.detectedFramework}`)
    }
    console.log(`  ${chalk.dim('Indexed:')}    ${p.isIndexed ? chalk.green('yes') : chalk.yellow('no')}`)
    console.log()
  } catch (err: any) {
    spinner.fail(chalk.red(`Analysis failed: ${err.message}`))
    process.exit(1)
  }
}

async function analyzeProjectCommand(id: string): Promise<void> {
  const config = loadConfig()

  if (!config.accessToken) {
    console.log(chalk.yellow('Not logged in. Run `martin login` first.'))
    process.exit(1)
  }

  await analyzeProjectById(id)
}

// ─── Command registration ─────────────────────────────────────────────────────

export function registerProjectsCommands(program: Command): void {
  const projects = program
    .command('projects')
    .description('Manage projects')
    .action(listProjectsCommand)

  projects
    .command('create')
    .description('Create a new project interactively')
    .action(createProjectCommand)

  projects
    .command('analyze <id>')
    .description('Analyze a project (detect language, framework, index files)')
    .action(analyzeProjectCommand)
}
