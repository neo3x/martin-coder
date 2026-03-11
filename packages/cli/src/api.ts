import type {
  User,
  Session,
  Message,
  Project,
  ProviderInfo,
  AgentDefinition,
  PaginatedResponse,
  StreamEvent,
  ToolCall,
  ToolResult,
} from '@martin-coder/shared'
import { loadConfig, saveConfig } from './config.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface CreateSessionData {
  title?: string
  projectId?: string
  provider?: string
  model?: string
  agentName?: string
  systemPrompt?: string
}

export interface CreateProjectData {
  name: string
  description?: string
  localPath?: string
  gitUrl?: string
  gitBranch?: string
}

export type StreamCallback = (event: StreamEvent) => void

export interface SessionSafetySettings {
  readOnlyMode: boolean
  requireApprovalForCommands: boolean
  writableRoots: string[]
  allowCommandPatterns: string[]
  denyCommandPatterns: string[]
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any,
    public correlationId?: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function refreshAccessToken(): Promise<string | null> {
  const config = loadConfig()
  if (!config.refreshToken) return null

  try {
    const res = await fetch(`${config.apiUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: config.refreshToken }),
    })

    if (!res.ok) return null

    const data = (await res.json()) as LoginResponse
    saveConfig({ accessToken: data.access_token, refreshToken: data.refresh_token })
    return data.access_token
  } catch {
    return null
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const config = loadConfig()
  const url = `${config.apiUrl}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (config.accessToken) {
    headers['Authorization'] = `Bearer ${config.accessToken}`
  }

  const res = await fetch(url, { ...options, headers })

  if (res.status === 401 && retry && config.refreshToken) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      return request<T>(path, options, false)
    }
    throw new ApiRequestError('Unauthorized – please log in again', 401)
  }

  if (!res.ok) {
    let errorBody: any = {}
    try {
      errorBody = await res.json()
    } catch {
      errorBody = { error: res.statusText }
    }
    throw new ApiRequestError(
      errorBody.error || errorBody.detail || res.statusText,
      res.status,
      errorBody.details,
      errorBody.correlationId,
    )
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T

  return res.json() as Promise<T>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<LoginResponse> {
  const config = loadConfig()
  // OAuth2 password flow uses form data
  const body = new URLSearchParams({ username: email, password })
  const res = await fetch(`${config.apiUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    let errorBody: any = {}
    try {
      errorBody = await res.json()
    } catch {
      errorBody = { error: res.statusText }
    }
    throw new ApiRequestError(
      errorBody.error || errorBody.detail || res.statusText,
      res.status,
    )
  }

  return res.json() as Promise<LoginResponse>
}

export async function register(
  email: string,
  password: string,
  username: string,
): Promise<User> {
  return request<User>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, username }),
  })
}

export async function logout(): Promise<void> {
  try {
    await request<void>('/api/v1/auth/logout', { method: 'POST' })
  } catch {
    // Best-effort – clear local tokens regardless
  }
}

export async function me(): Promise<User> {
  return request<User>('/api/v1/auth/me')
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function listSessions(): Promise<PaginatedResponse<Session>> {
  return request<PaginatedResponse<Session>>('/api/v1/sessions')
}

export async function createSession(data: CreateSessionData): Promise<Session> {
  return request<Session>('/api/v1/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getSession(id: string): Promise<Session> {
  return request<Session>(`/api/v1/sessions/${id}`)
}

export async function getSessionMessages(id: string): Promise<Message[]> {
  return request<Message[]>(`/api/v1/sessions/${id}/messages`)
}

export async function deleteSession(id: string): Promise<void> {
  return request<void>(`/api/v1/sessions/${id}`, { method: 'DELETE' })
}

export async function sendMessage(
  sessionId: string,
  content: string,
  agentOverride: string | undefined,
  onEvent: StreamCallback,
): Promise<void> {
  const config = loadConfig()
  const url = `${config.apiUrl}/api/v1/sessions/${sessionId}/messages`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  }

  if (config.accessToken) {
    headers['Authorization'] = `Bearer ${config.accessToken}`
  }

  const body: Record<string, any> = { content }
  if (agentOverride) body.agentName = agentOverride

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (res.status === 401 && config.refreshToken) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      return sendMessage(sessionId, content, agentOverride, onEvent)
    }
    throw new ApiRequestError('Unauthorized – please log in again', 401)
  }

  if (!res.ok) {
    let errorBody: any = {}
    try {
      errorBody = await res.json()
    } catch {
      errorBody = { error: res.statusText }
    }
    throw new ApiRequestError(
      errorBody.error || errorBody.detail || res.statusText,
      res.status,
    )
  }

  if (!res.body) {
    throw new Error('No response body for streaming request')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const event = JSON.parse(data) as StreamEvent
          onEvent(event)
        } catch {
          // Malformed SSE data – skip
        }
      }
    }
  }

  // Flush remaining buffer
  if (buffer.startsWith('data: ')) {
    const data = buffer.slice(6).trim()
    if (data && data !== '[DONE]') {
      try {
        const event = JSON.parse(data) as StreamEvent
        onEvent(event)
      } catch {
        // Ignore
      }
    }
  }
}



export async function getSessionSafetySettings(id: string): Promise<SessionSafetySettings> {
  const response = await request<{ safetySettings: SessionSafetySettings }>(`/api/v1/sessions/${id}/safety`)
  return response.safetySettings
}

export async function updateSessionSafetySettings(
  id: string,
  data: SessionSafetySettings,
): Promise<SessionSafetySettings> {
  const response = await request<{ safetySettings: SessionSafetySettings }>(`/api/v1/sessions/${id}/safety`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return response.safetySettings
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(): Promise<PaginatedResponse<Project>> {
  return request<PaginatedResponse<Project>>('/api/v1/projects')
}

export async function createProject(data: CreateProjectData): Promise<Project> {
  return request<Project>('/api/v1/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getProject(id: string): Promise<Project> {
  return request<Project>(`/api/v1/projects/${id}`)
}

export async function analyzeProject(id: string): Promise<{ message: string; project: Project }> {
  return request<{ message: string; project: Project }>(`/api/v1/projects/${id}/analyze`, {
    method: 'POST',
  })
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export async function listProviders(): Promise<ProviderInfo[]> {
  return request<ProviderInfo[]>('/api/v1/ai/providers')
}

export async function listAgents(): Promise<AgentDefinition[]> {
  return request<AgentDefinition[]>('/api/v1/ai/agents')
}

// ─── Files ────────────────────────────────────────────────────────────────────

export async function readFile(path: string): Promise<{ content: string; path: string }> {
  return request<{ content: string; path: string }>(
    `/api/v1/files/read?path=${encodeURIComponent(path)}`,
  )
}

export async function writeFile(
  path: string,
  content: string,
): Promise<{ message: string; path: string }> {
  return request<{ message: string; path: string }>('/api/v1/files/write', {
    method: 'POST',
    body: JSON.stringify({ path, content }),
  })
}

export async function listDirectory(
  path: string,
): Promise<{ entries: Array<{ name: string; type: 'file' | 'directory'; size?: number }> }> {
  return request<{
    entries: Array<{ name: string; type: 'file' | 'directory'; size?: number }>
  }>(`/api/v1/files/list?path=${encodeURIComponent(path)}`)
}
