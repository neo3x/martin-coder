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

export interface ToolCallRecord {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
  // Extended fields populated from API
  createdAt?: string;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
  toolCalls?: ToolCallRecord[];
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
