import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "en" | "es";

interface LanguageStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale: Locale) => {
        // Set cookie for server-side
        document.cookie = `locale=${locale};path=/;max-age=31536000`;
        set({ locale });
        // Reload to apply changes
        window.location.reload();
      },
    }),
    {
      name: "martin-coder-language",
    }
  )
);

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

export const localeFlags: Record<Locale, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
};
