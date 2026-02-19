"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useThemeStore } from "@/lib/stores/theme-store";
import { useModelStore } from "@/lib/stores/model-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );
  const { initialize, setToken, isAuthenticated } = useAuthStore();
  const { theme, setResolvedTheme } = useThemeStore();
  const { fetchProviders } = useModelStore();

  useEffect(() => {
    const bootstrap = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("access_token");

      if (token) {
        try {
          await setToken(token);
        } finally {
          params.delete("access_token");
          params.delete("refresh_token");
          const nextQuery = params.toString();
          const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
          window.history.replaceState({}, "", nextUrl);
        }
        return;
      }

      await initialize();
    };

    bootstrap().catch((err) => console.error("Auth bootstrap failed:", err));
  }, [initialize, setToken]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchProviders().catch((err) =>
      console.error("Failed to fetch providers:", err)
    );
  }, [fetchProviders, isAuthenticated]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const isDark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", isDark);
      setResolvedTheme(isDark ? "dark" : "light");
    };

    applyTheme();
    media.addEventListener("change", applyTheme);

    return () => {
      media.removeEventListener("change", applyTheme);
    };
  }, [setResolvedTheme, theme]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
