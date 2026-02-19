// ─── User types ───────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  email: string
  username: string
  fullName?: string
  avatarUrl?: string
  isActive: boolean
  isSuperuser: boolean
  isVerified: boolean
  defaultProvider: string
  defaultModel: string
  createdAt: string
  updatedAt: string
}

export interface UserPublic extends Omit<User, 'hashedPassword'> {}

// ─── Session types ────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export type AgentName = 'build' | 'plan'

export interface Session {
  id: string
  title: string
  userId: string
  projectId?: string
  provider: string
  model: string
  agentName: AgentName
  systemPrompt?: string
  messageCount: number
  totalTokens: number
  totalCost: number
  autoCompacted: boolean
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  sessionId: string
  role: MessageRole
  content: string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  promptTokens: number
  completionTokens: number
  costUsd: number
  model: string
  createdAt: string
}

// ─── Project types ────────────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  description?: string
  localPath?: string
  gitUrl?: string
  gitBranch?: string
  detectedLanguage?: string
  detectedFramework?: string
  isIndexed: boolean
  ownerId: string
  createdAt: string
  updatedAt: string
}

// ─── AI Provider types ────────────────────────────────────────────────────────

export type AIProvider = 'anthropic' | 'openai' | 'google' | 'ollama'

export interface ProviderInfo {
  name: AIProvider
  displayName: string
  models: ModelInfo[]
  isAvailable: boolean
  requiresApiKey: boolean
}

export interface ModelInfo {
  id: string
  name: string
  contextWindow: number
  supportsTools: boolean
  supportsVision: boolean
  inputCostPer1k: number
  outputCostPer1k: number
}

// ─── Agent types ──────────────────────────────────────────────────────────────

export interface AgentDefinition {
  name: AgentName
  displayName: string
  description: string
  allowedTools: string[]
  systemPrompt: string
  isReadOnly: boolean
}

// ─── Tool types ───────────────────────────────────────────────────────────────

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, any>
}

export interface ToolResult {
  toolCallId: string
  result: any
  error?: string
}

// ─── LSP types ────────────────────────────────────────────────────────────────

export interface LSPDiagnostic {
  file: string
  line: number
  character: number
  severity: 'error' | 'warning' | 'info' | 'hint'
  message: string
  source?: string
}

export interface LSPCompletion {
  label: string
  kind: string
  detail?: string
  documentation?: string
  insertText: string
}

export interface LSPHover {
  contents: string
  range?: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
}

// ─── MCP types ────────────────────────────────────────────────────────────────

export interface MCPServer {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
  status: 'connected' | 'disconnected' | 'error'
}

export interface MCPTool {
  serverName: string
  name: string
  description: string
  inputSchema: Record<string, any>
}

// ─── Plugin types ─────────────────────────────────────────────────────────────

export interface Plugin {
  id: string
  name: string
  version: string
  description?: string
  enabled: boolean
  config?: Record<string, any>
  userId: string
  createdAt: string
}

// ─── API Response types ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ApiError {
  error: string
  details?: any
  correlationId?: string
}

// ─── Streaming types ──────────────────────────────────────────────────────────

export type StreamEvent =
  | { type: 'text-delta'; textDelta: string }
  | { type: 'tool-call'; toolCall: ToolCall }
  | { type: 'tool-result'; toolResult: ToolResult }
  | {
      type: 'finish'
      usage: { promptTokens: number; completionTokens: number; totalTokens: number }
      cost: number
    }
  | { type: 'error'; error: string }
