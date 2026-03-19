import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  hashedPassword: text('hashed_password'),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  isSuperuser: integer('is_superuser', { mode: 'boolean' }).notNull().default(false),
  isVerified: integer('is_verified', { mode: 'boolean' }).notNull().default(false),
  defaultProvider: text('default_provider').notNull().default('anthropic'),
  defaultModel: text('default_model').notNull().default('claude-sonnet-4-5-20250929'),
  anthropicApiKey: text('anthropic_api_key'),
  openaiApiKey: text('openai_api_key'),
  googleApiKey: text('google_api_key'),
  oauthProvider: text('oauth_provider'),
  oauthId: text('oauth_id'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  lastLogin: text('last_login'),
})

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  localPath: text('local_path'),
  gitUrl: text('git_url'),
  gitBranch: text('git_branch').default('main'),
  detectedLanguage: text('detected_language'),
  detectedFramework: text('detected_framework'),
  isIndexed: integer('is_indexed', { mode: 'boolean' }).notNull().default(false),
  ownerId: text('owner_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  title: text('title').notNull().default('New Session'),
  userId: text('user_id').notNull().references(() => users.id),
  projectId: text('project_id').references(() => projects.id),
  provider: text('provider').notNull().default('anthropic'),
  model: text('model').notNull().default('claude-sonnet-4-5-20250929'),
  systemPrompt: text('system_prompt'),
  messageCount: integer('message_count').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  totalCost: real('total_cost').notNull().default(0),
  contextFiles: text('context_files').default('[]'),
  safetySettings: text('safety_settings').notNull().default('{}'),
  autoCompacted: integer('auto_compacted', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system' | 'tool'
  content: text('content').notNull(),
  toolCalls: text('tool_calls').default('[]'),
  toolResults: text('tool_results').default('[]'),
  promptTokens: integer('prompt_tokens').default(0),
  completionTokens: integer('completion_tokens').default(0),
  costUsd: real('cost_usd').default(0),
  model: text('model'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const plugins = sqliteTable('plugins', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  version: text('version').notNull().default('1.0.0'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  config: text('config').default('{}'),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// ─── Execution tracking tables ────────────────────────────────────────────────

export const executions = sqliteTable('executions', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  userId: text('user_id').notNull().references(() => users.id),
  prompt: text('prompt').notNull(),
  // Phase: understanding | scanning | reading | building | waiting_approval |
  //        generating | review_ready | applying | validating | completed | failed | rolled_back
  phase: text('phase').notNull().default('understanding'),
  agentName: text('agent_name').notNull().default('build'),
  filesChanged: integer('files_changed').notNull().default(0),
  validationPassed: integer('validation_passed', { mode: 'boolean' }),
  validationSummary: text('validation_summary'),
  errorMessage: text('error_message'),
  startedAt: text('started_at').notNull().default(sql`(datetime('now'))`),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const fileSnapshots = sqliteTable('file_snapshots', {
  id: text('id').primaryKey(),
  executionId: text('execution_id').notNull().references(() => executions.id),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  filePath: text('file_path').notNull(),
  // 'created' | 'modified' | 'deleted'
  changeType: text('change_type').notNull().default('modified'),
  contentBefore: text('content_before'),
  contentAfter: text('content_after'),
  diffText: text('diff_text'),
  linesAdded: integer('lines_added').notNull().default(0),
  linesRemoved: integer('lines_removed').notNull().default(0),
  isRestored: integer('is_restored', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const validationResults = sqliteTable('validation_results', {
  id: text('id').primaryKey(),
  executionId: text('execution_id').notNull().references(() => executions.id),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  // 'lint' | 'typecheck' | 'test' | 'build'
  toolType: text('tool_type').notNull(),
  toolCommand: text('tool_command').notNull(),
  passed: integer('passed', { mode: 'boolean' }).notNull().default(false),
  exitCode: integer('exit_code').notNull().default(0),
  stdout: text('stdout'),
  stderr: text('stderr'),
  errorCount: integer('error_count').notNull().default(0),
  warningCount: integer('warning_count').notNull().default(0),
  durationMs: integer('duration_ms').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type Plugin = typeof plugins.$inferSelect
export type NewPlugin = typeof plugins.$inferInsert
export type Execution = typeof executions.$inferSelect
export type NewExecution = typeof executions.$inferInsert
export type FileSnapshot = typeof fileSnapshots.$inferSelect
export type NewFileSnapshot = typeof fileSnapshots.$inferInsert
export type ValidationResult = typeof validationResults.$inferSelect
export type NewValidationResult = typeof validationResults.$inferInsert
