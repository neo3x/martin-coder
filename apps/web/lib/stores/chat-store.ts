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
    const chats = await api.get<Chat[]>("/chat/");
    set({ chats });
  },

  selectChat: async (chatId: string) => {
    const chat = await api.get<Chat & { messages?: ChatMessage[] }>(`/chat/${chatId}`);
    set({
      currentChat: chat,
      messages: chat.messages ?? [],
    });
  },

  createChat: async (payload) => {
    const { selectedProvider, selectedModel } = useModelStore.getState();
    const chat = await api.post<Chat>("/chat/", {
      title: payload.title,
      project_id: payload.project_id,
      ai_provider: selectedProvider,
      ai_model: selectedModel,
    });

    set((state) => ({
      chats: [chat, ...state.chats],
      currentChat: chat,
      messages: [],
    }));

    return chat;
  },

  deleteChat: async (chatId) => {
    await api.delete(`/chat/${chatId}`);

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
        `/chat/${state.currentChat.id}/messages`,
        {
          message: content,
          stream: true,
          ai_provider: state.currentChat.ai_provider,
          ai_model: state.currentChat.ai_model,
        },
        {
          onEvent: (event) => {
            const chunk = event as StreamChunk;
            if (chunk.type === "content" && chunk.content) {
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
      set({ isStreaming: false, streamingContent: "" });
      throw error;
    }
  },

  updateCurrentChatModel: async (provider, model) => {
    const chat = get().currentChat;
    if (!chat) return;

    const updated = await api.patch<Chat>(`/chat/${chat.id}`, {
      ai_provider: provider,
      ai_model: model,
    });

    set((state) => ({
      currentChat: updated,
      chats: state.chats.map((item) => (item.id === updated.id ? updated : item)),
    }));
  },
}));
