import { create } from "zustand";
import { api } from "@/lib/api";
import type { AuthTokens, User } from "@/lib/types";

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  setToken: (accessToken: string, refreshToken?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setError: (error) => set({ error }),

  initialize: async () => {
    const token = api.storage.accessToken;
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const user = await api.get<User>("/auth/me");
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch {
      api.storage.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setToken: async (accessToken, refreshToken = "") => {
    api.storage.setTokens(accessToken, refreshToken || api.storage.refreshToken || "");
    try {
      const user = await api.get<User>("/auth/me");
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: unknown) {
      api.storage.clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: err instanceof Error ? err.message : "Authentication failed",
      });
      throw err;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await api.post<AuthTokens>("/auth/login", { email, password });
      const accessToken = tokens.access_token ?? tokens.accessToken;
      const refreshToken = tokens.refresh_token ?? tokens.refreshToken ?? "";

      if (!accessToken) {
        throw new Error("Login response did not include an access token");
      }

      api.storage.setTokens(accessToken, refreshToken);
      const user = await api.get<User>("/auth/me");
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Login failed",
      });
      throw err;
    }
  },

  register: async (email, username, password) => {
    set({ isLoading: true, error: null });
    try {
      await api.post<User>("/auth/register", { email, username, password });
      await useAuthStore.getState().login(email, password);
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Register failed",
      });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Ignore logout API errors; clear local auth state anyway.
    }

    api.storage.clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },
}));
