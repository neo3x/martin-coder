"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useModelStore } from "@/lib/stores/model-store";
import { useThemeStore } from "@/lib/stores/theme-store";
import { useChatStore } from "@/lib/stores/chat-store";
import { LanguageSwitcher } from "@/components/language-switcher";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const t = useTranslations();
  const { user, logout }      = useAuthStore();
  const { currentSession, updateSessionModel } = useChatStore();
  const { providers, selectedProvider, selectedModel, setProvider, setModel } = useModelStore();
  const { resolvedTheme, setTheme } = useThemeStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const fallbackProviders = useMemo(
    () => [
      { name: "claude",   models: ["claude-sonnet-4-5-20250929"],  default_model: "claude-sonnet-4-5-20250929", is_available: true },
      { name: "openai",   models: ["gpt-4o"],                       default_model: "gpt-4o",                    is_available: true },
      { name: "lmstudio", models: ["local-model"],                  default_model: "local-model",               is_available: true },
      { name: "ollama",   models: ["codellama"],                    default_model: "codellama",                 is_available: true },
    ],
    []
  );

  const effectiveProviders = providers.length > 0 ? providers : fallbackProviders;
  const provider = effectiveProviders.find((p) => p.name === selectedProvider) ?? effectiveProviders[0];
  const modelOptions = provider?.models?.length ? provider.models : [provider?.default_model ?? selectedModel];

  const providerLabel: Record<string, string> = {
    claude:   "Anthropic",
    openai:   "OpenAI",
    lmstudio: "LM Studio",
    ollama:   "Ollama",
  };

  const handleProviderChange = async (next: string) => {
    const p = effectiveProviders.find((x) => x.name === next);
    const nextModel = p?.default_model ?? p?.models?.[0] ?? "";
    setProvider(next);
    if (nextModel) {
      setModel(nextModel);
      if (currentSession) await updateSessionModel(next, nextModel);
    }
  };

  const handleModelChange = async (next: string) => {
    setModel(next);
    if (currentSession) await updateSessionModel(selectedProvider, next);
  };

  const displayName = user?.username || user?.email?.split("@")[0] || "User";
  const initials    = displayName.charAt(0).toUpperCase();

  return (
    <header className="h-12 flex-shrink-0 flex items-center justify-between px-3 border-b border-border/50 bg-card/60 backdrop-blur-xl sticky top-0 z-30">
      {/* Left: hamburger (mobile) + logo + session title */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden icon-btn"
          title="Open sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>

        <div className="hidden sm:flex items-center gap-3 min-w-0">
          {currentSession ? (
            <span className="text-xs text-muted-foreground truncate max-w-[200px] lg:max-w-[320px]">
              {currentSession.title}
            </span>
          ) : (
            <>
              <h1 className="text-lg font-bold tracking-tight">Martin-Coder</h1>
              <div className="hidden lg:flex items-center gap-3 text-[11px] text-muted-foreground/80">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted/60 font-mono text-[10px]">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted/60 font-mono text-[10px]">`</kbd>
                  <span>{t("workspace.terminal")}</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted/60 font-mono text-[10px]">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted/60 font-mono text-[10px]">E</kbd>
                  <span>{t("workspace.editor")}</span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: provider/model selectors + theme + user */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Provider + Model selectors (desktop) */}
        <div className="hidden md:flex items-center gap-1.5">
          <select
            value={selectedProvider}
            onChange={(e) => void handleProviderChange(e.target.value)}
            className="bg-secondary/50 text-xs px-2.5 py-1.5 rounded-lg border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
            aria-label="AI provider"
          >
            {effectiveProviders.map((p) => (
              <option key={p.name} value={p.name}>
                {providerLabel[p.name] ?? p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedModel}
            onChange={(e) => void handleModelChange(e.target.value)}
            className="bg-secondary/50 text-xs px-2.5 py-1.5 rounded-lg border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer max-w-[180px] truncate"
            aria-label="AI model"
          >
            {modelOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="icon-btn"
          title={resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
        >
          {resolvedTheme === "dark" ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9 9 0 1020.354 15.354z" />
            </svg>
          )}
        </button>

        {/* Language switcher */}
        <LanguageSwitcher />

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu((v) => !v)}
            className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-secondary/50 transition-colors"
          >
            <div className="avatar w-7 h-7 text-xs">{initials}</div>
            <span className="hidden lg:block text-xs font-medium">{displayName}</span>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="dropdown-menu right-0 top-full mt-1.5 z-50">
                <div className="px-3 py-2 border-b border-border/50 mb-0.5">
                  <p className="text-xs font-medium">{displayName}</p>
                  <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                </div>

                {/* Mobile: provider + model selectors */}
                <div className="md:hidden px-2 py-2 border-b border-border/50 space-y-1.5 mb-0.5">
                  <select
                    value={selectedProvider}
                    onChange={(e) => void handleProviderChange(e.target.value)}
                    className="w-full bg-secondary/50 text-xs px-2 py-1.5 rounded-lg border border-border/50 focus:outline-none"
                  >
                    {effectiveProviders.map((p) => (
                      <option key={p.name} value={p.name}>{providerLabel[p.name] ?? p.name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedModel}
                    onChange={(e) => void handleModelChange(e.target.value)}
                    className="w-full bg-secondary/50 text-xs px-2 py-1.5 rounded-lg border border-border/50 focus:outline-none"
                  >
                    {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => { setShowUserMenu(false); logout(); }}
                  className="dropdown-item w-full text-destructive hover:bg-destructive/10"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {t("auth.signOut")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
