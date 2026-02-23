import { create } from "zustand";
import { api } from "@/lib/api";
import { useModelStore } from "@/lib/stores/model-store";
import type { Chat, ChatMessage } from "@/lib/types";

// Re-export Session as an alias for Chat
export type Session = Chat;

interface SessionCreatePayload {
  title: string;
  project_id?: string;
}

interface StreamChunk {
  type?: string;
  content?: string;
  tool_call_id?: string;
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  tool_result?: unknown;
  tool_error?: string;
  usage?: UsageInfo;
  cost?: number;
}

interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface StreamingToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status: "calling" | "done" | "error";
}

interface SessionDto {
  id: string;
  title: string;
  provider: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messages?: MessageDto[];
}

interface MessageDto {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
}

function mapSessionToChat(session: SessionDto): Chat {
  return {
    id: session.id,
    title: session.title,
    ai_provider: session.provider,
    ai_model: session.model,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

function mapMessageToChatMessage(message: MessageDto): ChatMessage {
  return {
    id: message.id,
    chat_id: message.sessionId,
    role: message.role,
    content: message.content,
    created_at: message.createdAt,
  };
}

interface ChatStore {
  // Session list
  sessions: Chat[];
  currentSession: Chat | null;
  messages: ChatMessage[];

  // Streaming state
  isStreaming: boolean;
  streamingContent: string;
  streamingToolCalls: StreamingToolCall[];

  // Usage / cost of last response
  lastUsage: UsageInfo | null;
  lastCost: number;

  // Agent mode
  selectedAgent: "build" | "plan";
  setAgent: (agent: "build" | "plan") => void;

  // Session CRUD
  fetchSessions: () => Promise<void>;
  selectSession: (sessionId: string) => Promise<void>;
  createSession: (payload: SessionCreatePayload) => Promise<Chat>;
  deleteSession: (sessionId: string) => Promise<void>;

  // Messaging
  sendMessage: (message: string) => Promise<void>;
  updateSessionModel: (provider: string, model: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",
  streamingToolCalls: [],
  lastUsage: null,
  lastCost: 0,
  selectedAgent: "build",

  setAgent: (agent) => set({ selectedAgent: agent }),

  fetchSessions: async () => {
    const data = await api.get<{ sessions: SessionDto[] }>("/sessions");
    set({ sessions: (data.sessions || []).map(mapSessionToChat) });
  },

  selectSession: async (sessionId: string) => {
    const data = await api.get<{ session: SessionDto }>(`/sessions/${sessionId}`);
    const chat = mapSessionToChat(data.session);
    set({
      currentSession: chat,
      messages: (data.session.messages || []).map(mapMessageToChatMessage),
    });
  },

  createSession: async (payload) => {
    const { selectedProvider, selectedModel } = useModelStore.getState();
    const data = await api.post<{ session: SessionDto }>("/sessions", {
      title: payload.title,
      projectId: payload.project_id,
      provider: selectedProvider,
      model: selectedModel,
    });
    const chat = mapSessionToChat(data.session);
    set((state) => ({
      sessions: [chat, ...state.sessions],
      currentSession: chat,
      messages: [],
    }));
    return chat;
  },

  deleteSession: async (sessionId) => {
    await api.delete(`/sessions/${sessionId}`);
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== sessionId);
      const isCurrent = state.currentSession?.id === sessionId;
      return {
        sessions,
        currentSession: isCurrent ? null : state.currentSession,
        messages: isCurrent ? [] : state.messages,
      };
    });
  },

  sendMessage: async (content) => {
    const state = get();
    if (!state.currentSession) {
      throw new Error("No active session");
    }

    const optimisticUserMessage: ChatMessage = {
      id: crypto.randomUUID(),
      chat_id: state.currentSession.id,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    set((prev) => ({
      messages: [...prev.messages, optimisticUserMessage],
      isStreaming: true,
      streamingContent: "",
      streamingToolCalls: [],
      lastUsage: null,
      lastCost: 0,
    }));

    try {
      await api.stream(
        `/sessions/${state.currentSession.id}/messages`,
        { content, agent: state.selectedAgent },
        {
          onEvent: (event) => {
            const chunk = event as StreamChunk;

            if (chunk.type === "text" && chunk.content) {
              set((prev) => ({
                streamingContent: `${prev.streamingContent}${chunk.content}`,
              }));
            } else if (chunk.type === "tool_call_start") {
              const newTc: StreamingToolCall = {
                id: chunk.tool_call_id ?? crypto.randomUUID(),
                name: chunk.tool_name ?? "unknown",
                arguments: chunk.tool_args ?? {},
                status: "calling",
              };
              set((prev) => ({
                streamingToolCalls: [...prev.streamingToolCalls, newTc],
              }));
            } else if (chunk.type === "tool_call_result") {
              set((prev) => ({
                streamingToolCalls: prev.streamingToolCalls.map((tc) =>
                  tc.id === chunk.tool_call_id
                    ? {
                        ...tc,
                        result: chunk.tool_result,
                        error: chunk.tool_error,
                        status: chunk.tool_error ? "error" : "done",
                      }
                    : tc
                ),
              }));
            } else if (chunk.type === "usage" && chunk.usage) {
              set({ lastUsage: chunk.usage, lastCost: chunk.cost ?? 0 });
            }
          },
          onDone: async () => {
            const current = get();
            const latestContent = current.streamingContent;
            if (latestContent.trim()) {
              const assistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                chat_id: state.currentSession!.id,
                role: "assistant",
                content: latestContent,
                created_at: new Date().toISOString(),
              };
              set((prev) => ({
                messages: [...prev.messages, assistantMessage],
                isStreaming: false,
                streamingContent: "",
                streamingToolCalls: [],
              }));
            } else {
              set({ isStreaming: false, streamingContent: "", streamingToolCalls: [] });
            }

            await get().selectSession(state.currentSession!.id);
            await get().fetchSessions();
          },
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message";
      const assistantError: ChatMessage = {
        id: crypto.randomUUID(),
        chat_id: state.currentSession.id,
        role: "assistant",
        content: `Error: ${message}`,
        created_at: new Date().toISOString(),
      };
      set((prev) => ({
        messages: [...prev.messages, assistantError],
        isStreaming: false,
        streamingContent: "",
        streamingToolCalls: [],
      }));
    }
  },

  updateSessionModel: async (provider, model) => {
    const session = get().currentSession;
    if (!session) return;
    const updated: Chat = {
      ...session,
      ai_provider: provider,
      ai_model: model,
    };
    set((state) => ({
      currentSession: updated,
      sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
    }));
  },
}));
