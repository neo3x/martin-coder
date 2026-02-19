import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { DEFAULT_PROVIDER, DEFAULT_MODEL } from '@martin-coder/shared'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CliConfig {
  apiUrl: string
  accessToken?: string
  refreshToken?: string
  defaultProvider: string
  defaultModel: string
  defaultAgent: string
}

// ─── Paths ────────────────────────────────────────────────────────────────────

const CONFIG_DIR = join(homedir(), '.martin-coder')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: CliConfig = {
  apiUrl: 'http://localhost:8000',
  defaultProvider: DEFAULT_PROVIDER,
  defaultModel: DEFAULT_MODEL,
  defaultAgent: 'build',
}

// ─── Functions ────────────────────────────────────────────────────────────────

export function loadConfig(): CliConfig {
  if (!existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG }
  }

  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<CliConfig>
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(updates: Partial<CliConfig>): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }

  const current = loadConfig()
  const merged: CliConfig = { ...current, ...updates }
  writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8')
}

export function clearConfig(): void {
  if (existsSync(CONFIG_FILE)) {
    unlinkSync(CONFIG_FILE)
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE
}
