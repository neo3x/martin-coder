"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ChatPanel } from "@/components/chat/chat-panel";
import { EditorPanel } from "@/components/editor/editor-panel";
import { TerminalPanel } from "@/components/terminal/terminal-panel";
import { useAuthStore } from "@/lib/stores/auth-store";
import { LoginForm } from "@/components/auth/login-form";

export default function Home() {
  const { isAuthenticated } = useAuthStore();
  const [activePanel, setActivePanel] = useState<"chat" | "editor" | "terminal">("chat");
  const [showTerminal, setShowTerminal] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* Main content area */}
            <div className="flex-1 flex">
              {/* Chat Panel */}
              <div className={`${activePanel === "chat" ? "flex-1" : "w-96 border-r"} flex flex-col`}>
                <ChatPanel />
              </div>

              {/* Editor Panel */}
              {activePanel !== "chat" && (
                <div className="flex-1 flex flex-col">
                  <EditorPanel />
                </div>
              )}
            </div>
          </div>

          {/* Terminal Panel */}
          {showTerminal && (
            <div className="h-64 border-t">
              <TerminalPanel onClose={() => setShowTerminal(false)} />
            </div>
          )}
        </main>
      </div>

      {/* Floating action buttons */}
      <div className="fixed bottom-4 right-4 flex gap-2">
        <button
          onClick={() => setShowTerminal(!showTerminal)}
          className="p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90"
          title="Toggle Terminal"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={() => setActivePanel(activePanel === "chat" ? "editor" : "chat")}
          className="p-3 rounded-full bg-secondary text-secondary-foreground shadow-lg hover:opacity-90"
          title="Toggle View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
