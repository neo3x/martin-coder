"use client";

import { useAuthStore } from "@/lib/stores/auth-store";

export function Header() {
  const { user, logout } = useAuthStore();

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-card">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">Martin-Coder</h1>
        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
          v0.1.0
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* AI Provider selector */}
        <select className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md text-sm border-0 focus:ring-2 focus:ring-primary">
          <option value="claude">Claude</option>
          <option value="openai">OpenAI</option>
          <option value="lmstudio">LM Studio</option>
          <option value="ollama">Ollama</option>
        </select>

        {/* User menu */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {user?.username || user?.email}
          </span>
          <button
            onClick={logout}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
