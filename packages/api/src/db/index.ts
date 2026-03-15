import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema.js'
import { mkdirSync } from 'fs'
import { dirname } from 'path'

const dbPath = process.env.DATABASE_PATH || './data/martin-coder.db'

// Ensure the data directory exists
try {
  mkdirSync(dirname(dbPath), { recursive: true })
} catch {
  // Directory may already exist
}

const sqlite = new Database(dbPath)

// Enable WAL mode for better concurrent performance
sqlite.exec('PRAGMA journal_mode = WAL')
sqlite.exec('PRAGMA foreign_keys = ON')
sqlite.exec('PRAGMA synchronous = NORMAL')

export const db = drizzle(sqlite, { schema })

// Run migrations (create tables if they don't exist)
export function runMigrations() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      hashed_password TEXT,
      full_name TEXT,
      avatar_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_superuser INTEGER NOT NULL DEFAULT 0,
      is_verified INTEGER NOT NULL DEFAULT 0,
      default_provider TEXT NOT NULL DEFAULT 'anthropic',
      default_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
      anthropic_api_key TEXT,
      openai_api_key TEXT,
      google_api_key TEXT,
      oauth_provider TEXT,
      oauth_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      local_path TEXT,
      git_url TEXT,
      git_branch TEXT DEFAULT 'main',
      detected_language TEXT,
      detected_framework TEXT,
      is_indexed INTEGER NOT NULL DEFAULT 0,
      owner_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New Session',
      user_id TEXT NOT NULL REFERENCES users(id),
      project_id TEXT REFERENCES projects(id),
      provider TEXT NOT NULL DEFAULT 'anthropic',
      model TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
      system_prompt TEXT,
      message_count INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      context_files TEXT DEFAULT '[]',
      safety_settings TEXT NOT NULL DEFAULT '{}',
      auto_compacted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_calls TEXT DEFAULT '[]',
      tool_results TEXT DEFAULT '[]',
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      model TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '1.0.0',
      enabled INTEGER NOT NULL DEFAULT 1,
      config TEXT DEFAULT '{}',
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)



  // New tables for Phase 2: trust, traceability, validation
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS executions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      prompt TEXT NOT NULL,
      phase TEXT NOT NULL DEFAULT 'understanding',
      agent_name TEXT NOT NULL DEFAULT 'build',
      files_changed INTEGER NOT NULL DEFAULT 0,
      validation_passed INTEGER,
      validation_summary TEXT,
      error_message TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS file_snapshots (
      id TEXT PRIMARY KEY,
      execution_id TEXT NOT NULL REFERENCES executions(id),
      session_id TEXT NOT NULL REFERENCES sessions(id),
      file_path TEXT NOT NULL,
      change_type TEXT NOT NULL DEFAULT 'modified',
      content_before TEXT,
      content_after TEXT,
      diff_text TEXT,
      lines_added INTEGER NOT NULL DEFAULT 0,
      lines_removed INTEGER NOT NULL DEFAULT 0,
      is_restored INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS validation_results (
      id TEXT PRIMARY KEY,
      execution_id TEXT NOT NULL REFERENCES executions(id),
      session_id TEXT NOT NULL REFERENCES sessions(id),
      tool_type TEXT NOT NULL,
      tool_command TEXT NOT NULL,
      passed INTEGER NOT NULL DEFAULT 0,
      exit_code INTEGER NOT NULL DEFAULT 0,
      stdout TEXT,
      stderr TEXT,
      error_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  try {
    sqlite.exec("ALTER TABLE sessions ADD COLUMN safety_settings TEXT NOT NULL DEFAULT '{}'")
  } catch {
    // Column may already exist
  }

  console.log('[DB] Migrations completed successfully')
}

export { schema }
