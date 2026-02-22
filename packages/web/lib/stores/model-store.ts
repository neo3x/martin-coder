import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";
import type { AIProvider } from "@/lib/types";

interface ModelStore {
  providers: AIProvider[];
  selectedProvider: string;
  selectedModel: string;
  isLoading: boolean;
  fetchProviders: () => Promise<void>;
  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
}

const FALLBACK_PROVIDER = "claude";
const FALLBACK_MODEL = "claude-sonnet-4-5-20250929";

export const useModelStore = create<ModelStore>()(
  persist(
    (set, get) => ({
      providers: [],
      selectedProvider: FALLBACK_PROVIDER,
      selectedModel: FALLBACK_MODEL,
      isLoading: false,

      fetchProviders: async () => {
        set({ isLoading: true });
        try {
          const data = await api.get<{
            providers: Array<{
              name: string;
              displayName: string;
              models: Array<{ id: string }>;
              requiresApiKey: boolean;
            }>;
          }>("/ai/providers");
          const providers: AIProvider[] = (data.providers || []).map((p) => ({
            name: p.name,
            display_name: p.displayName,
            models: (p.models || []).map((m) => m.id),
            default_model: (p.models || [])[0]?.id,
            is_available: true,
            is_local: p.name === "ollama",
          }));
          const available = providers.filter((provider) => provider.is_available !== false);
          const currentProvider = get().selectedProvider;

          const nextProvider =
            available.find((provider) => provider.name === currentProvider) ??
            available[0] ??
            providers[0];

          const nextModel =
            nextProvider?.models.find((model) => model === get().selectedModel) ??
            nextProvider?.default_model ??
            nextProvider?.models[0] ??
            FALLBACK_MODEL;

          set({
            providers,
            selectedProvider: nextProvider?.name ?? FALLBACK_PROVIDER,
            selectedModel: nextModel,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      },

      setProvider: (provider) => {
        const providerData = get().providers.find((item) => item.name === provider);
        const defaultModel = providerData?.default_model ?? providerData?.models[0] ?? get().selectedModel;
        set({ selectedProvider: provider, selectedModel: defaultModel });
      },

      setModel: (model) => set({ selectedModel: model }),
    }),
    {
      name: "martin-coder-model",
      partialize: (state) => ({
        selectedProvider: state.selectedProvider,
        selectedModel: state.selectedModel,
      }),
    }
  )
);
