export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

export interface AuthTokens {
  access_token?: string;
  refresh_token?: string;
  accessToken?: string;
  refreshToken?: string;
  token_type?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  error?: string;
}

export interface ChatMessage {
  id: string;
  // Legacy + current field names are both supported.
  chat_id: string;
  sessionId?: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
  createdAt?: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
  model?: string;
}

export interface Chat {
  id: string;
  title: string;
  ai_provider: string;
  ai_model: string;
  created_at: string;
  updated_at: string;
}

export interface AIProvider {
  name: string;
  models: string[];
  default_model?: string;
  is_available?: boolean;
  is_local?: boolean;
  display_name?: string;
}
