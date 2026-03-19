"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useThemeStore } from "@/lib/stores/theme-store";

const labels = {
  en: {
    features: "Features",
    pricing: "Pricing",
    product: "Product",
    login: "Login",
    launch: "Open App",
    menu: "Menu",
  },
  es: {
    features: "Funciones",
    pricing: "Precios",
    product: "Producto",
    login: "Iniciar sesión",
    launch: "Abrir app",
    menu: "Menú",
  },
};

function getLocale(): "en" | "es" {
  if (typeof document === "undefined") return "en";
  return document.cookie.includes("locale=es") ? "es" : "en";
}

const navLinks = [
  { key: "features" as const, href: "/features" },
  { key: "pricing" as const, href: "/pricing" },
  { key: "product" as const, href: "/product" },
];

export function SiteHeader() {
  const path = usePathname();
  const { resolvedTheme, setTheme } = useThemeStore();
  const locale = getLocale();
  const t = labels[locale];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => path === href;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <span className="font-bold tracking-tight text-sm">MartinCoder</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive(link.href)
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              {t[link.key]}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="icon-btn"
            title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
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

          {/* Login (desktop) */}
          <Link href="/login" className="btn-ghost hidden sm:inline-flex text-sm">
            {t.login}
          </Link>

          {/* Open App CTA */}
          <Link href="/app" className="btn-primary text-sm px-4 py-2">
            {t.launch}
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden icon-btn ml-1"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={t.menu}
          >
            {mobileMenuOpen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl animate-slide-down">
          <nav className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive(link.href)
                    ? "text-foreground bg-accent font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {t[link.key]}
              </Link>
            ))}
            <div className="border-t border-border/30 mt-1 pt-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                {t.login}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
