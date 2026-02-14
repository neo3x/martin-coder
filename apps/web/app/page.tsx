"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ChatPanel } from "@/components/chat/chat-panel";
import { EditorPanel } from "@/components/editor/editor-panel";
import { TerminalPanel } from "@/components/terminal/terminal-panel";
import { useAuthStore } from "@/lib/stores/auth-store";
import { LoginForm } from "@/components/auth/login-form";

export default function Home() {
  const t = useTranslations("workspace");
  const { isAuthenticated, isLoading } = useAuthStore();
  const [showTerminal, setShowTerminal] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gradient-bg p-4">
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
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            <div
              className={`${
                showEditor
                  ? "hidden lg:flex lg:w-[420px] lg:min-w-[360px] lg:border-r lg:border-border/50"
                  : "flex"
              } flex-1 flex-col transition-all duration-300`}
            >
              <ChatPanel />
            </div>

            {showEditor && (
              <div className="flex-1 min-w-0 flex flex-col animate-slide-up">
                <EditorPanel onClose={() => setShowEditor(false)} />
              </div>
            )}
          </div>

          {showTerminal && (
            <div className="h-56 lg:h-72 border-t border-border/50 animate-slide-up">
              <TerminalPanel onClose={() => setShowTerminal(false)} />
            </div>
          )}
        </main>
      </div>

      <div className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 flex flex-col-reverse gap-3 z-40">
        <button
          onClick={() => setShowTerminal(!showTerminal)}
          className={`group relative fab ${showTerminal ? 'bg-primary' : 'bg-card border border-border/50 text-foreground shadow-xl'}`}
          title={showTerminal ? t("hideTerminal") : t("showTerminal")}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {/* Tooltip */}
          <span className="absolute right-full mr-3 px-2 py-1 text-xs font-medium bg-foreground text-background rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {showTerminal ? t("hideTerminal") : t("showTerminal")}
          </span>
        </button>

        <button
          onClick={() => setShowEditor(!showEditor)}
          className={`group relative fab ${showEditor ? 'bg-primary' : 'bg-card border border-border/50 text-foreground shadow-xl'}`}
          title={showEditor ? t("hideEditor") : t("showEditor")}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          {/* Tooltip */}
          <span className="absolute right-full mr-3 px-2 py-1 text-xs font-medium bg-foreground text-background rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {showEditor ? t("hideEditor") : t("showEditor")}
          </span>
        </button>
      </div>

      <div className="fixed top-20 right-6 hidden lg:flex items-center gap-4 text-xs text-muted-foreground/60 bg-card/70 border border-border/50 rounded-xl px-3 py-2 backdrop-blur-md z-30">
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">Ctrl</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">`</kbd>
          <span className="ml-1">{t("terminal")}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">Ctrl</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">E</kbd>
          <span className="ml-1">{t("editor")}</span>
        </span>
      </div>
    </div>
  );
}
