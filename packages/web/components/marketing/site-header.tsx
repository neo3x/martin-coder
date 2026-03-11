"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useThemeStore } from "@/lib/stores/theme-store";

const labels = {
  en: { features: "Features", pricing: "Pricing", product: "Product", login: "Login", launch: "Open App" },
  es: { features: "Funciones", pricing: "Precios", product: "Producto", login: "Iniciar sesión", launch: "Abrir app" },
};

function getLocale() {
  if (typeof document === "undefined") return "en";
  return document.cookie.includes("locale=es") ? "es" : "en";
}

export function SiteHeader() {
  const path = usePathname();
  const { resolvedTheme, setTheme } = useThemeStore();
  const locale = getLocale() as "en" | "es";
  const t = labels[locale];

  const linkClass = (href: string) =>
    `text-sm ${path === href ? "text-foreground" : "text-muted-foreground"} hover:text-foreground transition-colors`;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">MartinCoder</Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/features" className={linkClass("/features")}>{t.features}</Link>
          <Link href="/pricing" className={linkClass("/pricing")}>{t.pricing}</Link>
          <Link href="/product" className={linkClass("/product")}>{t.product}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="icon-btn" title="Toggle theme">◐</button>
          <LanguageSwitcher />
          <Link href="/login" className="btn-ghost hidden sm:inline-flex">{t.login}</Link>
          <Link href="/app" className="btn-primary">{t.launch}</Link>
        </div>
      </div>
    </header>
  );
}
