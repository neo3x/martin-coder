"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useChatStore } from "@/lib/stores/chat-store";

export function Sidebar() {
  const t = useTranslations("sidebar");
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
          {t("newChat")}
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
          {t("projects")}
        </h3>
        <button className="w-full py-2 px-4 border border-dashed rounded-md text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
          {t("openProject")}
        </button>
      </div>

      {/* Integrations Section */}
      <div className="border-t p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          {t("integrations")}
        </h3>
        <div className="space-y-2">
          <a
            href="/drive"
            className="flex items-center gap-2 py-2 px-3 rounded-md text-sm hover:bg-accent transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 87.3 78" fill="none">
              <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H1.2c0 1.55.4 3.1 1.2 4.5l4.2 9.35z" fill="#0066DA"/>
              <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 52.45c-.8 1.4-1.2 2.95-1.2 4.5h27.6L43.65 25z" fill="#00AC47"/>
              <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.9l6.85 11.9 6.8 11.9z" fill="#EA4335"/>
              <path d="M43.65 25L57.4 1.2c-1.35-.8-2.9-1.2-4.5-1.2H34.25c-1.6 0-3.15.45-4.5 1.2L43.65 25z" fill="#00832D"/>
              <path d="M59.9 57H27.6L13.85 80.8c1.35.8 2.9 1.2 4.5 1.2h50.45c1.6 0 3.15-.45 4.5-1.2L59.9 57z" fill="#2684FC"/>
              <path d="M73.4 26.55l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.25 28.15h26.4c0-1.55-.4-3.1-1.2-4.5l-11.7-22.1z" fill="#FFBA00"/>
            </svg>
            {t("googleDrive")}
          </a>
          <a
            href="/github"
            className="flex items-center gap-2 py-2 px-3 rounded-md text-sm hover:bg-accent transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            {t("github")}
          </a>
        </div>
      </div>
    </aside>
  );
}
