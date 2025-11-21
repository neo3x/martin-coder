"use client";

import { useEffect } from "react";
import { useChatStore } from "@/lib/stores/chat-store";

export function Sidebar() {
  const { chats, currentChat, fetchChats, selectChat, createChat, deleteChat } =
    useChatStore();

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const handleNewChat = async () => {
    await createChat({ title: "New Chat" });
  };

  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      {/* New Chat Button */}
      <div className="p-4 border-b">
        <button
          onClick={handleNewChat}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 flex items-center justify-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Chat
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent ${
                currentChat?.id === chat.id ? "bg-accent" : ""
              }`}
              onClick={() => selectChat(chat.id)}
            >
              <svg
                className="w-4 h-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span className="flex-1 truncate text-sm">{chat.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded"
              >
                <svg
                  className="w-3 h-3 text-destructive"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Projects Section */}
      <div className="border-t p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Projects
        </h3>
        <button className="w-full py-2 px-4 border border-dashed rounded-md text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
          + Open Project
        </button>
      </div>
    </aside>
  );
}
