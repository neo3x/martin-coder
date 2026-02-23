/**
 * martin-coder v2.0 — Extended API client
 * Adds: sessions (agents), LSP, MCP, providers, cost tracking
 * Wraps the base api client in lib/api.ts
 */

import { api } from "./api";

export type AgentName = "build" | "plan";
export type AIProvider = "anthropic" | "openai" | "google" | "ollama" | "lmstudio";
export type MessageRole = "user" | "assistant" | "system" | "tool";

// ── Sessions (formerly "chats") ────────────────────────────────────────────

export interface Session {
  id: string;
  title: string;
  userId: string;
  projectId?: string;
  provider: AIProvider;
  model: string;
  agentName: AgentName;
  systemPrompt?: string;
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  autoCompacted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  toolResults?: Array<{ toolCallId: string; result: unknown; error?: string }>;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  model: string;
  createdAt: string;
}

export interface CreateSessionInput {
  title?: string;
  projectId?: string;
  provider?: AIProvider;
  model?: string;
  agentName?: AgentName;
  systemPrompt?: string;
}

export interface SendMessageInput {
  content: string;
  agentName?: AgentName;
  stream?: boolean;
}

export type StreamEvent =
  | { type: "text-delta"; textDelta: string }
  | { type: "tool-call"; toolCall: { id: string; name: string; arguments: Record<string, unknown> } }
  | { type: "tool-result"; toolResult: { toolCallId: string; result: unknown; error?: string } }
  | { type: "finish"; usage: { promptTokens: number; completionTokens: number; totalTokens: number }; cost: number }
  | { type: "error"; error: string };

// ── AI Providers ───────────────────────────────────────────────────────────

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  supportsTools: boolean;
  supportsVision: boolean;
  inputCostPer1k: number;
  outputCostPer1k: number;
}

export interface ProviderInfo {
  name: AIProvider;
  displayName: string;
  models: ModelInfo[];
  isAvailable: boolean;
  requiresApiKey: boolean;
}

// ── Agents ─────────────────────────────────────────────────────────────────

export interface AgentDefinition {
  name: AgentName;
  displayName: string;
  description: string;
  allowedTools: string[];
  isReadOnly: boolean;
}

// ── LSP ────────────────────────────────────────────────────────────────────

export interface LSPDiagnostic {
  file: string;
  line: number;
  character: number;
  severity: "error" | "warning" | "info" | "hint";
  message: string;
  source?: string;
}

export interface LSPCompletion {
  label: string;
  kind: string;
  detail?: string;
  documentation?: string;
  insertText: string;
}

export interface LSPHover {
  contents: string;
  range?: { start: { line: number; character: number }; end: { line: number; character: number } };
}

// ── MCP ────────────────────────────────────────────────────────────────────

export interface MCPServer {
  name: string;
  command: string;
  args: string[];
  status: "connected" | "disconnected" | "error";
}

export interface MCPTool {
  serverName: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// ── API methods ────────────────────────────────────────────────────────────

export const sessionsApi = {
  list: () => api.get<Session[]>("/sessions"),

  create: (input: CreateSessionInput) => api.post<Session>("/sessions", input),

  get: (id: string) => api.get<Session & { messages: SessionMessage[] }>(`/sessions/${id}`),

  update: (id: string, data: Partial<Pick<Session, "title" | "agentName" | "provider" | "model">>) =>
    api.patch<Session>(`/sessions/${id}`, data),

  delete: (id: string) => api.delete<void>(`/sessions/${id}`),

  listMessages: (id: string) => api.get<SessionMessage[]>(`/sessions/${id}/messages`),

  /** Send a message and stream the response via SSE */
  sendMessage: (
    sessionId: string,
    input: SendMessageInput,
    handlers: {
      onTextDelta: (delta: string) => void;
      onToolCall?: (toolCall: { id: string; name: string; arguments: Record<string, unknown> }) => void;
      onToolResult?: (result: { toolCallId: string; result: unknown; error?: string }) => void;
      onFinish?: (usage: { promptTokens: number; completionTokens: number; totalTokens: number }, cost: number) => void;
      onError?: (error: string) => void;
    }
  ) =>
    api.stream(`/sessions/${sessionId}/messages`, { ...input, stream: true }, {
      onEvent: (event) => {
        const e = event as StreamEvent;
        switch (e.type) {
          case "text-delta":
            handlers.onTextDelta(e.textDelta);
            break;
          case "tool-call":
            handlers.onToolCall?.(e.toolCall);
            break;
          case "tool-result":
            handlers.onToolResult?.(e.toolResult);
            break;
          case "finish":
            handlers.onFinish?.(e.usage, e.cost);
            break;
          case "error":
            handlers.onError?.(e.error);
            break;
        }
      },
      onDone: () => handlers.onFinish?.(
        { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        0
      ),
    }),
};

export const aiApi = {
  listProviders: () => api.get<ProviderInfo[]>("/ai/providers"),
  getProviderModels: (provider: AIProvider) => api.get<ModelInfo[]>(`/ai/providers/${provider}/models`),
  checkHealth: () => api.get<Record<AIProvider, boolean>>("/ai/health"),
  listAgents: () => api.get<AgentDefinition[]>("/ai/agents"),
};

export const lspApi = {
  startServer: (language: string, workspacePath: string) =>
    api.post<{ ok: boolean }>("/lsp/start", { language, workspacePath }),

  stopServer: (language: string) =>
    api.post<{ ok: boolean }>("/lsp/stop", { language }),

  getDiagnostics: (language: string, filePath: string, content: string) =>
    api.post<LSPDiagnostic[]>("/lsp/diagnostics", { language, filePath, content }),

  getCompletions: (language: string, filePath: string, content: string, line: number, character: number) =>
    api.post<LSPCompletion[]>("/lsp/completions", { language, filePath, content, line, character }),

  getHover: (language: string, filePath: string, content: string, line: number, character: number) =>
    api.post<LSPHover | null>("/lsp/hover", { language, filePath, content, line, character }),

  listServers: () =>
    api.get<Array<{ language: string; status: string }>>("/lsp/servers"),
};

export const mcpApi = {
  listServers: () => api.get<MCPServer[]>("/mcp/servers"),

  addServer: (server: Omit<MCPServer, "status">) =>
    api.post<MCPServer>("/mcp/servers", server),

  removeServer: (name: string) => api.delete<void>(`/mcp/servers/${name}`),

  listTools: (serverName?: string) =>
    api.get<MCPTool[]>(serverName ? `/mcp/tools?server=${serverName}` : "/mcp/tools"),

  callTool: (serverName: string, toolName: string, args: Record<string, unknown>) =>
    api.post<unknown>(`/mcp/tools/${serverName}/${toolName}`, args),
};

export const pluginsApi = {
  list: () => api.get<Array<{ id: string; name: string; version: string; enabled: boolean; config?: Record<string, unknown> }>>("/plugins"),
  install: (name: string, config?: Record<string, unknown>) => api.post("/plugins", { name, config }),
  uninstall: (id: string) => api.delete(`/plugins/${id}`),
  toggle: (id: string, enabled: boolean) => api.patch(`/plugins/${id}`, { enabled }),
};
