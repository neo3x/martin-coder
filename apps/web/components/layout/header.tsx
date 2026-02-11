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
  const { user, logout } = useAuthStore();
  const { currentChat, updateCurrentChatModel } = useChatStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { providers, selectedProvider, selectedModel, setProvider, setModel } =
    useModelStore();
  const { resolvedTheme, setTheme } = useThemeStore();

  const fallbackProviders = useMemo(
    () => [
      { name: "claude", models: ["claude-sonnet-4-5-20250929"], default_model: "claude-sonnet-4-5-20250929", is_available: true, is_local: false },
      { name: "openai", models: ["gpt-4o"], default_model: "gpt-4o", is_available: true, is_local: false },
      { name: "lmstudio", models: ["local-model"], default_model: "local-model", is_available: true, is_local: true },
      { name: "ollama", models: ["codellama"], default_model: "codellama", is_available: true, is_local: true },
    ],
    []
  );

  const effectiveProviders = providers.length > 0 ? providers : fallbackProviders;
  const provider = effectiveProviders.find((p) => p.name === selectedProvider) ?? effectiveProviders[0];
  const modelOptions = provider?.models?.length ? provider.models : [provider?.default_model ?? selectedModel];

  const providerLabel: Record<string, string> = {
    claude: t("providers.anthropic"),
    openai: t("providers.openai"),
    lmstudio: t("providers.lmstudio"),
    ollama: t("providers.ollama"),
  };

  const handleProviderChange = async (nextProvider: string) => {
    const selected = effectiveProviders.find((p) => p.name === nextProvider);
    const nextModel = selected?.default_model || selected?.models?.[0] || "";
    setProvider(nextProvider);
    if (!nextModel) return;
    setModel(nextModel);
    if (currentChat) {
      await updateCurrentChatModel(nextProvider, nextModel);
    }
  };

  const handleModelChange = async (nextModel: string) => {
    setModel(nextModel);
    if (currentChat) {
      await updateCurrentChatModel(selectedProvider, nextModel);
    }
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <header className="h-16 border-b border-border/50 flex items-center justify-between px-3 md:px-6 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden icon-btn"
          title="Open sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <div className="hidden sm:block">
          <h1 className="text-lg font-bold tracking-tight">Martin-Coder</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden md:flex items-center gap-2">
          <select
            value={selectedProvider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="bg-secondary/50 text-sm font-medium px-3 py-2 rounded-xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-label="AI provider"
          >
            {effectiveProviders.map((item) => (
              <option key={item.name} value={item.name}>
                {providerLabel[item.name] ?? item.name}
              </option>
            ))}
          </select>

          <select
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            className="bg-secondary/50 text-sm font-medium px-3 py-2 rounded-xl border border-border/50 min-w-[180px] lg:min-w-[220px] focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-label={t("chat.selectModel")}
          >
            {modelOptions.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <button onClick={toggleTheme} className="icon-btn" title={resolvedTheme === "dark" ? t("header.lightMode") : t("header.darkMode")}>
          {resolvedTheme === "dark" ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9 9 0 1020.354 15.354z" />
            </svg>
          )}
        </button>

        <LanguageSwitcher />

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-secondary/50 transition-colors"
          >
            <div className="avatar">
              {(user?.username || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium leading-none">
                {user?.username || user?.email?.split("@")[0] || "User"}
              </p>
            </div>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="dropdown-menu right-0 top-full mt-2 z-50">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-sm font-medium">{user?.username || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="dropdown-item w-full text-red-500 hover:text-red-500 hover:bg-red-500/10"
                >
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
