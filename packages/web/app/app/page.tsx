"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ChatPanel } from "@/components/chat/chat-panel";
import { EditorPanel } from "@/components/editor/editor-panel";
import { TerminalPanel } from "@/components/terminal/terminal-panel";
import { useAuthStore } from "@/lib/stores/auth-store";
import { LoginForm } from "@/components/auth/login-form";
import { useProjectStore } from "@/lib/stores/project-store";

export default function WorkspacePage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [showTerminal, setShowTerminal] = useState(false);
  const { editorOpen, setEditorOpen } = useProjectStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (isLoading) return <div className="min-h-screen grid place-items-center">Loading…</div>;
  if (!isAuthenticated) return <div className="min-h-screen grid place-items-center gradient-bg p-4"><LoginForm /></div>;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header onMenuClick={() => setMobileSidebarOpen(true)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-shrink-0 flex items-center justify-end gap-1 px-3 py-1 border-b border-border/30">
            <button type="button" onClick={() => setEditorOpen(!editorOpen)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${editorOpen ? "bg-primary/10 text-primary" : "text-muted-foreground/60 hover:text-foreground hover:bg-accent"}`}>Editor</button>
            <button type="button" onClick={() => setShowTerminal((v) => !v)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${showTerminal ? "bg-primary/10 text-primary" : "text-muted-foreground/60 hover:text-foreground hover:bg-accent"}`}>Terminal</button>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <div className={`flex flex-col overflow-hidden transition-all duration-200 ${editorOpen ? "hidden lg:flex lg:w-[45%] lg:min-w-[320px] border-r border-border/50" : "flex-1"}`}><ChatPanel /></div>
            {editorOpen && <div className="flex-1 min-w-0 flex flex-col overflow-hidden animate-fade-in"><EditorPanel onClose={() => setEditorOpen(false)} /></div>}
          </div>
          {showTerminal && <div className="flex-shrink-0 h-52 lg:h-64 border-t border-border/50 animate-slide-up"><TerminalPanel onClose={() => setShowTerminal(false)} /></div>}
        </main>
      </div>
    </div>
  );
}
