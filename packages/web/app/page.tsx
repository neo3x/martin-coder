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
  const { isAuthenticated, isLoading } = useAuthStore();
  const [showTerminal, setShowTerminal] = useState(false);
  const [showEditor, setShowEditor]    = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Loading splash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center animate-pulse">
          <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
      </div>
    );
  }

  // Auth wall
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gradient-bg p-4">
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <Header onMenuClick={() => setMobileSidebarOpen(true)} />

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main content area */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Toolbar: editor + terminal toggles */}
          <div className="flex-shrink-0 flex items-center justify-end gap-1 px-3 py-1 border-b border-border/30">
            <button
              type="button"
              onClick={() => setShowEditor((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                showEditor
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-accent"
              }`}
              title="Toggle editor (Ctrl+E)"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="hidden sm:inline">Editor</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTerminal((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                showTerminal
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-accent"
              }`}
              title="Toggle terminal (Ctrl+`)"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Terminal</span>
            </button>
          </div>

          {/* Chat + Editor side by side */}
          <div className="flex-1 flex overflow-hidden">
            {/* Chat panel */}
            <div
              className={`flex flex-col overflow-hidden transition-all duration-200 ${
                showEditor
                  ? "hidden lg:flex lg:w-[45%] lg:min-w-[320px] border-r border-border/50"
                  : "flex-1"
              }`}
            >
              <ChatPanel />
            </div>

            {/* Editor panel */}
            {showEditor && (
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden animate-fade-in">
                <EditorPanel onClose={() => setShowEditor(false)} />
              </div>
            )}
          </div>

          {/* Terminal drawer (bottom) */}
          {showTerminal && (
            <div className="flex-shrink-0 h-52 lg:h-64 border-t border-border/50 animate-slide-up">
              <TerminalPanel onClose={() => setShowTerminal(false)} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
