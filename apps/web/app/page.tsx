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
  const [showEditor, setShowEditor] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gradient-bg p-4">
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* Chat Panel - Always visible */}
            <div className={`${showEditor ? 'w-[400px] min-w-[350px] border-r border-border/50' : 'flex-1'} flex flex-col transition-all duration-300`}>
              <ChatPanel />
            </div>

            {/* Editor Panel */}
            {showEditor && (
              <div className="flex-1 flex flex-col animate-slide-up">
                <EditorPanel />
              </div>
            )}
          </div>

          {/* Terminal Panel */}
          {showTerminal && (
            <div className="h-72 border-t border-border/50 animate-slide-up">
              <TerminalPanel onClose={() => setShowTerminal(false)} />
            </div>
          )}
        </main>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col-reverse gap-3">
        {/* Toggle Terminal */}
        <button
          onClick={() => setShowTerminal(!showTerminal)}
          className={`group relative fab ${showTerminal ? 'bg-primary' : 'bg-card border border-border/50 text-foreground shadow-xl'}`}
          title={showTerminal ? "Hide Terminal" : "Show Terminal"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {/* Tooltip */}
          <span className="absolute right-full mr-3 px-2 py-1 text-xs font-medium bg-foreground text-background rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {showTerminal ? "Hide Terminal" : "Show Terminal"}
          </span>
        </button>

        {/* Toggle Editor */}
        <button
          onClick={() => setShowEditor(!showEditor)}
          className={`group relative fab ${showEditor ? 'bg-primary' : 'bg-card border border-border/50 text-foreground shadow-xl'}`}
          title={showEditor ? "Hide Editor" : "Show Editor"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          {/* Tooltip */}
          <span className="absolute right-full mr-3 px-2 py-1 text-xs font-medium bg-foreground text-background rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {showEditor ? "Hide Editor" : "Show Editor"}
          </span>
        </button>

        {/* View Toggle */}
        <button
          onClick={() => setActivePanel(activePanel === "chat" ? "editor" : "chat")}
          className="group relative fab bg-gradient-to-br from-primary to-purple-600"
          title="Toggle View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          {/* Tooltip */}
          <span className="absolute right-full mr-3 px-2 py-1 text-xs font-medium bg-foreground text-background rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Toggle Layout
          </span>
        </button>
      </div>

      {/* Keyboard Shortcuts Indicator */}
      <div className="fixed bottom-6 left-6 hidden lg:flex items-center gap-4 text-xs text-muted-foreground/60">
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">Ctrl</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">`</kbd>
          <span className="ml-1">Terminal</span>
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">Ctrl</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">E</kbd>
          <span className="ml-1">Editor</span>
        </span>
      </div>
    </div>
  );
}
