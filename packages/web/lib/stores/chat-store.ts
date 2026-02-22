import { create } from "zustand";
import { api } from "@/lib/api";
import { useModelStore } from "@/lib/stores/model-store";
import type { Chat, ChatMessage } from "@/lib/types";

interface ChatCreatePayload {
  title: string;
  project_id?: string;
}

interface StreamChunk {
  type?: string;
  content?: string;
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
  chats: Chat[];
  currentChat: Chat | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  fetchChats: () => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  createChat: (payload: ChatCreatePayload) => Promise<Chat>;
  deleteChat: (chatId: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  updateCurrentChatModel: (provider: string, model: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  currentChat: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",

  fetchChats: async () => {
    const data = await api.get<{ sessions: SessionDto[] }>("/sessions");
    set({ chats: (data.sessions || []).map(mapSessionToChat) });
  },

  selectChat: async (chatId: string) => {
    const data = await api.get<{ session: SessionDto }>(`/sessions/${chatId}`);
    const chat = mapSessionToChat(data.session);
    set({
      currentChat: chat,
      messages: (data.session.messages || []).map(mapMessageToChatMessage),
    });
  },

  createChat: async (payload) => {
    const { selectedProvider, selectedModel } = useModelStore.getState();
    const data = await api.post<{ session: SessionDto }>("/sessions", {
      title: payload.title,
      projectId: payload.project_id,
      provider: selectedProvider,
      model: selectedModel,
    });
    const chat = mapSessionToChat(data.session);

    set((state) => ({
      chats: [chat, ...state.chats],
      currentChat: chat,
      messages: [],
    }));

    return chat;
  },

  deleteChat: async (chatId) => {
    await api.delete(`/sessions/${chatId}`);

    set((state) => {
      const chats = state.chats.filter((chat) => chat.id !== chatId);
      const isCurrent = state.currentChat?.id === chatId;

      return {
        chats,
        currentChat: isCurrent ? null : state.currentChat,
        messages: isCurrent ? [] : state.messages,
      };
    });
  },

  sendMessage: async (content) => {
    const state = get();
    if (!state.currentChat) {
      throw new Error("No active chat");
    }

    const optimisticUserMessage: ChatMessage = {
      id: crypto.randomUUID(),
      chat_id: state.currentChat.id,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    set((prev) => ({
      messages: [...prev.messages, optimisticUserMessage],
      isStreaming: true,
      streamingContent: "",
    }));

    try {
      await api.stream(
        `/sessions/${state.currentChat.id}/messages`,
        {
          content,
        },
        {
          onEvent: (event) => {
            const chunk = event as StreamChunk;
            if (chunk.type === "text" && chunk.content) {
              set((prev) => ({
                streamingContent: `${prev.streamingContent}${chunk.content}`,
              }));
            }
          },
          onDone: async () => {
            const current = get();
            const latestContent = current.streamingContent;
            if (latestContent.trim()) {
              const assistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                chat_id: state.currentChat!.id,
                role: "assistant",
                content: latestContent,
                created_at: new Date().toISOString(),
              };

              set((prev) => ({
                messages: [...prev.messages, assistantMessage],
                isStreaming: false,
                streamingContent: "",
              }));
            } else {
              set({ isStreaming: false, streamingContent: "" });
            }

            await get().selectChat(state.currentChat!.id);
            await get().fetchChats();
          },
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message";
      const assistantError: ChatMessage = {
        id: crypto.randomUUID(),
        chat_id: state.currentChat.id,
        role: "assistant",
        content: `Error: ${message}`,
        created_at: new Date().toISOString(),
      };
      set((prev) => ({
        messages: [...prev.messages, assistantError],
        isStreaming: false,
        streamingContent: "",
      }));
    }
  },

  updateCurrentChatModel: async (provider, model) => {
    const chat = get().currentChat;
    if (!chat) return;
    const updated: Chat = {
      ...chat,
      ai_provider: provider,
      ai_model: model,
    };

    set((state) => ({
      currentChat: updated,
      chats: state.chats.map((item) => (item.id === updated.id ? updated : item)),
    }));
  },
}));
