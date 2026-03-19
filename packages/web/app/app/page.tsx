"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ChatPanel } from "@/components/chat/chat-panel";
import { EditorPanel } from "@/components/editor/editor-panel";
import { TerminalPanel } from "@/components/terminal/terminal-panel";
import { useAuthStore } from "@/lib/stores/auth-store";
import { LoginForm } from "@/components/auth/login-form";
import { useProjectStore } from "@/lib/stores/project-store";

type PanelLayout = "chat" | "split" | "editor";

export default function WorkspacePage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [showTerminal, setShowTerminal] = useState(false);
  const { editorOpen, setEditorOpen } = useProjectStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [panelLayout, setPanelLayout] = useState<PanelLayout>("chat");

  // Sync panelLayout with editorOpen store
  useEffect(() => {
    if (!editorOpen && panelLayout !== "chat") {
      setPanelLayout("chat");
    } else if (editorOpen && panelLayout === "chat") {
      setPanelLayout("split");
    }
  }, [editorOpen, panelLayout]);

  const handleToggleEditor = useCallback(() => {
    if (editorOpen) {
      setEditorOpen(false);
      setPanelLayout("chat");
    } else {
      setEditorOpen(true);
      setPanelLayout("split");
    }
  }, [editorOpen, setEditorOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        setShowTerminal((prev: boolean) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        handleToggleEditor();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleToggleEditor]);

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen grid place-items-center gradient-bg bg-background p-4">
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header onMenuClick={() => setMobileSidebarOpen(true)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* ── Panel toolbar ──────────────────────────────────────────── */}
          <div className="flex-shrink-0 flex items-center justify-between gap-1 px-3 py-1.5 border-b border-border/30 bg-card/30">
            {/* Layout controls */}
            <div className="flex items-center gap-0.5">
              <PanelButton
                active={panelLayout === "chat"}
                onClick={() => { setPanelLayout("chat"); setEditorOpen(false); }}
                title="Chat only"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Chat</span>
              </PanelButton>
              <PanelButton
                active={panelLayout === "split"}
                onClick={() => { setPanelLayout("split"); setEditorOpen(true); }}
                title="Split view"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                </svg>
                <span>Split</span>
              </PanelButton>
              <PanelButton
                active={panelLayout === "editor"}
                onClick={() => { setPanelLayout("editor"); setEditorOpen(true); }}
                title="Editor focus"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span>Editor</span>
              </PanelButton>
            </div>

            {/* Terminal toggle */}
            <button
              type="button"
              onClick={() => setShowTerminal((prev: boolean) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                showTerminal
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-accent"
              }`}
              title="Toggle terminal (Ctrl+`)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Terminal</span>
              <kbd className="hidden sm:block text-[9px] font-mono bg-secondary/60 px-1 rounded opacity-60">
                Ctrl+`
              </kbd>
            </button>
          </div>

          {/* ── Panel area ─────────────────────────────────────────────── */}
          <div className="flex-1 flex overflow-hidden">
            {/* Chat panel — hidden only in full editor mode on desktop */}
            <div
              className={[
                "flex flex-col overflow-hidden transition-all duration-200",
                panelLayout === "editor"
                  ? "hidden lg:flex lg:w-[35%] lg:min-w-[300px] border-r border-border/50"
                  : panelLayout === "split"
                  ? "hidden lg:flex lg:w-[45%] lg:min-w-[320px] border-r border-border/50"
                  : "flex-1",
              ].join(" ")}
            >
              <ChatPanel />
            </div>

            {/* Editor panel */}
            {editorOpen && (
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden animate-fade-in">
                <EditorPanel onClose={() => { setEditorOpen(false); setPanelLayout("chat"); }} />
              </div>
            )}
          </div>

          {/* ── Terminal ───────────────────────────────────────────────── */}
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

// ── Panel button helper ────────────────────────────────────────────────────────

function PanelButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground/60 hover:text-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}
