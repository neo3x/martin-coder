"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useChatStore } from "@/lib/stores/chat-store";

export function Sidebar() {
  const t = useTranslations("sidebar");
  const { chats, currentChat, fetchChats, selectChat, createChat, deleteChat } =
    useChatStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const handleNewChat = async () => {
    await createChat({ title: "New Chat" });
  };

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group chats by date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groupedChats = {
    today: filteredChats.filter(chat => {
      const chatDate = new Date(chat.created_at);
      return chatDate.toDateString() === today.toDateString();
    }),
    yesterday: filteredChats.filter(chat => {
      const chatDate = new Date(chat.created_at);
      return chatDate.toDateString() === yesterday.toDateString();
    }),
    lastWeek: filteredChats.filter(chat => {
      const chatDate = new Date(chat.created_at);
      return chatDate > lastWeek && chatDate < yesterday;
    }),
    older: filteredChats.filter(chat => {
      const chatDate = new Date(chat.created_at);
      return chatDate <= lastWeek;
    }),
  };

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-72'} border-r border-border/50 bg-card/30 flex flex-col transition-all duration-300`}>
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          {!isCollapsed && (
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Chats
            </h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="icon-btn ml-auto"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            <svg className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          className={`w-full btn-gradient flex items-center justify-center gap-2 ${isCollapsed ? 'p-3' : ''}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {!isCollapsed && <span>{t("newChat")}</span>}
        </button>

        {/* Search */}
        {!isCollapsed && (
          <div className="mt-3 relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-secondary/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
            />
          </div>
        )}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2">
        {!isCollapsed ? (
          <div className="space-y-4">
            {/* Today */}
            {groupedChats.today.length > 0 && (
              <div>
                <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Today</p>
                <div className="space-y-0.5">
                  {groupedChats.today.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={currentChat?.id === chat.id}
                      onSelect={() => selectChat(chat.id)}
                      onDelete={() => deleteChat(chat.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Yesterday */}
            {groupedChats.yesterday.length > 0 && (
              <div>
                <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Yesterday</p>
                <div className="space-y-0.5">
                  {groupedChats.yesterday.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={currentChat?.id === chat.id}
                      onSelect={() => selectChat(chat.id)}
                      onDelete={() => deleteChat(chat.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Last 7 days */}
            {groupedChats.lastWeek.length > 0 && (
              <div>
                <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Last 7 days</p>
                <div className="space-y-0.5">
                  {groupedChats.lastWeek.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={currentChat?.id === chat.id}
                      onSelect={() => selectChat(chat.id)}
                      onDelete={() => deleteChat(chat.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Older */}
            {groupedChats.older.length > 0 && (
              <div>
                <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Older</p>
                <div className="space-y-0.5">
                  {groupedChats.older.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={currentChat?.id === chat.id}
                      onSelect={() => selectChat(chat.id)}
                      onDelete={() => deleteChat(chat.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredChats.length === 0 && (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm text-muted-foreground">No chats found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Start a new conversation</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredChats.slice(0, 10).map((chat) => (
              <button
                key={chat.id}
                onClick={() => selectChat(chat.id)}
                className={`w-full p-3 rounded-xl transition-colors ${
                  currentChat?.id === chat.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-accent text-muted-foreground'
                }`}
                title={chat.title}
              >
                <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section */}
      {!isCollapsed && (
        <div className="border-t border-border/50 p-4 space-y-4">
          {/* Projects Section */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {t("projects")}
            </h3>
            <button className="w-full py-2.5 px-4 border border-dashed border-border/60 rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all">
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("openProject")}
              </span>
            </button>
          </div>

          {/* Integrations Section */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {t("integrations")}
            </h3>
            <div className="space-y-1">
              <a
                href="/drive"
                className="sidebar-item"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 87.3 78" fill="currentColor">
                    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H1.2c0 1.55.4 3.1 1.2 4.5l4.2 9.35z"/>
                    <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 52.45c-.8 1.4-1.2 2.95-1.2 4.5h27.6L43.65 25z"/>
                  </svg>
                </div>
                <span className="text-sm">{t("googleDrive")}</span>
              </a>
              <a
                href="/github"
                className="sidebar-item"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </div>
                <span className="text-sm">{t("github")}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

interface ChatItemProps {
  chat: { id: string; title: string; created_at: string };
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ChatItem({ chat, isActive, onSelect, onDelete }: ChatItemProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
        isActive
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-accent text-foreground'
      }`}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <svg
        className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
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
      <span className="flex-1 truncate text-sm font-medium">{chat.title}</span>

      {/* Action buttons */}
      <div className={`flex items-center gap-1 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete chat"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
