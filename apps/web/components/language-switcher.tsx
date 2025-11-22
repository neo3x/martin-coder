"use client";

import { useLanguageStore, localeNames, localeFlags, Locale } from "@/lib/stores/language-store";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguageStore();

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
        title="Change language"
      >
        <span className="text-lg">{localeFlags[locale]}</span>
        <span className="text-sm hidden sm:inline">{localeNames[locale]}</span>
        <svg
          className="w-4 h-4 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <div className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[140px]">
        {(Object.keys(localeNames) as Locale[]).map((loc) => (
          <button
            key={loc}
            onClick={() => setLocale(loc)}
            className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg ${
              locale === loc ? "bg-muted font-medium" : ""
            }`}
          >
            <span>{localeFlags[loc]}</span>
            <span>{localeNames[loc]}</span>
            {locale === loc && (
              <svg
                className="w-4 h-4 ml-auto text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
