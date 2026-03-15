"use client";

import Link from "next/link";

const copy = {
  en: {
    tagline: "Repository-aware AI workspace for serious developers.",
    product: "Product",
    links1: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Product", href: "/product" },
      { label: "Open App", href: "/app" },
    ],
    resources: "Resources",
    links2: [
      { label: "Documentation", href: "#" },
      { label: "Changelog", href: "#" },
      { label: "Status", href: "#" },
    ],
    company: "Company",
    links3: [
      { label: "About", href: "/product" },
      { label: "Contact", href: "#" },
    ],
    copy: `© ${new Date().getFullYear()} MartinCoder. All rights reserved.`,
    privacy: "Privacy",
    terms: "Terms",
  },
  es: {
    tagline: "Espacio de trabajo IA consciente del repositorio para desarrolladores serios.",
    product: "Producto",
    links1: [
      { label: "Funcionalidades", href: "/features" },
      { label: "Precios", href: "/pricing" },
      { label: "Producto", href: "/product" },
      { label: "Abrir app", href: "/app" },
    ],
    resources: "Recursos",
    links2: [
      { label: "Documentación", href: "#" },
      { label: "Cambios", href: "#" },
      { label: "Estado", href: "#" },
    ],
    company: "Empresa",
    links3: [
      { label: "Acerca de", href: "/product" },
      { label: "Contacto", href: "#" },
    ],
    copy: `© ${new Date().getFullYear()} MartinCoder. Todos los derechos reservados.`,
    privacy: "Privacidad",
    terms: "Términos",
  },
};

function getLocale(): "en" | "es" {
  if (typeof document === "undefined") return "en";
  return document.cookie.includes("locale=es") ? "es" : "en";
}

export function SiteFooter() {
  const t = copy[getLocale()];

  return (
    <footer className="border-t border-border/40 bg-card/30">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <span className="font-bold text-sm">MartinCoder</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">{t.tagline}</p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">{t.product}</p>
            <ul className="space-y-2">
              {t.links1.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">{t.resources}</p>
            <ul className="space-y-2">
              {t.links2.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">{t.company}</p>
            <ul className="space-y-2">
              {t.links3.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/60">{t.copy}</p>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">{t.privacy}</Link>
            <Link href="#" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">{t.terms}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
