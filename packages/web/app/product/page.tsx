"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

const copy = {
  en: {
    badge: "About MartinCoder",
    title: "Built for developers who think before they build.",
    sub: "MartinCoder is a production-grade AI coding workspace designed around a single principle: AI should help you think more clearly, not just type faster.",
    missionTitle: "Our mission",
    mission: "Most AI coding tools are optimized for speed and autocomplete. They make code generation feel effortless — until something breaks in production and you're not sure what the AI actually changed or why. We believe the right answer is more deliberate AI: a system that interprets, explains, and waits for your understanding before acting. MartinCoder is built around this model.",
    pillarsTitle: "Three pillars",
    pillars: [
      {
        icon: "🛡️",
        title: "Trust",
        desc: "Every action the AI takes is visible. Every tool call is shown in real time. Plan mode ensures no writes happen without your intent. The interpretation phase ensures the AI understood you correctly before it acts.",
      },
      {
        icon: "🎮",
        title: "Control",
        desc: "You choose the provider, the model, the agent mode, and the session. You see what files are affected before changes are made. You approve — or you refine. The workflow adapts to your level of trust.",
      },
      {
        icon: "⚡",
        title: "Velocity",
        desc: "Deliberate does not mean slow. From interpretation to execution, the workflow is designed to be fast once you have confidence. Streaming outputs, real-time tool traces, and session continuity keep momentum high.",
      },
    ],
    techTitle: "Architecture that earns trust",
    techDesc: "MartinCoder is built on a monorepo with clearly separated concerns: a Next.js frontend, a Hono API layer, and shared TypeScript types.",
    techItems: [
      { label: "Frontend", value: "Next.js 14 + React 18 + Tailwind CSS" },
      { label: "Backend", value: "Hono 4 + Drizzle ORM + SQLite" },
      { label: "AI SDK", value: "Vercel AI SDK with multi-provider streaming" },
      { label: "Runtime", value: "Bun (fast, TypeScript-native)" },
      { label: "i18n", value: "next-intl (English + Spanish)" },
      { label: "Editor", value: "Monaco Editor (VS Code engine)" },
      { label: "Terminal", value: "xterm.js with full PTY support" },
      { label: "Protocol", value: "MCP + LSP integration" },
    ],
    stackTitle: "What makes it production-grade",
    stack: [
      "JWT authentication with refresh token rotation",
      "Per-session safety settings (read-only locks, writable root restrictions)",
      "Streaming via Server-Sent Events with full error recovery",
      "Context window management and auto-compaction",
      "Token counting and USD cost tracking per message",
      "Soft delete patterns with full audit timestamps",
      "OpenAPI-documented API surface",
      "Turborepo monorepo with shared TypeScript types",
    ],
    ctaTitle: "Ready to see it in action?",
    cta: "Open the workspace",
    cta2: "View pricing",
  },
  es: {
    badge: "Acerca de MartinCoder",
    title: "Construido para desarrolladores que piensan antes de construir.",
    sub: "MartinCoder es un workspace de codificación IA de calidad de producción diseñado alrededor de un principio: la IA debe ayudarte a pensar con más claridad, no solo a escribir más rápido.",
    missionTitle: "Nuestra misión",
    mission: "La mayoría de las herramientas de codificación IA están optimizadas para velocidad y autocompletado. Hacen que la generación de código parezca sin esfuerzo — hasta que algo falla en producción y no estás seguro de qué cambió la IA o por qué. Creemos que la respuesta correcta es una IA más deliberada: un sistema que interpreta, explica y espera tu comprensión antes de actuar. MartinCoder está construido alrededor de este modelo.",
    pillarsTitle: "Tres pilares",
    pillars: [
      {
        icon: "🛡️",
        title: "Confianza",
        desc: "Cada acción que toma la IA es visible. Cada llamada a herramienta se muestra en tiempo real. El modo Plan asegura que no ocurran escrituras sin tu intención. La fase de interpretación asegura que la IA te entendió correctamente antes de actuar.",
      },
      {
        icon: "🎮",
        title: "Control",
        desc: "Tú eliges el proveedor, el modelo, el modo del agente y la sesión. Ves qué archivos se ven afectados antes de que se realicen cambios. Apruebas — o refinas. El flujo de trabajo se adapta a tu nivel de confianza.",
      },
      {
        icon: "⚡",
        title: "Velocidad",
        desc: "Deliberado no significa lento. Desde la interpretación hasta la ejecución, el flujo de trabajo está diseñado para ser rápido una vez que tienes confianza. Los outputs en streaming, las trazas de herramientas en tiempo real y la continuidad de sesión mantienen el impulso alto.",
      },
    ],
    techTitle: "Arquitectura que genera confianza",
    techDesc: "MartinCoder está construido sobre un monorepo con responsabilidades claramente separadas: un frontend Next.js, una capa de API Hono y tipos TypeScript compartidos.",
    techItems: [
      { label: "Frontend", value: "Next.js 14 + React 18 + Tailwind CSS" },
      { label: "Backend", value: "Hono 4 + Drizzle ORM + SQLite" },
      { label: "AI SDK", value: "Vercel AI SDK con streaming multi-proveedor" },
      { label: "Runtime", value: "Bun (rápido, TypeScript nativo)" },
      { label: "i18n", value: "next-intl (Inglés + Español)" },
      { label: "Editor", value: "Monaco Editor (motor de VS Code)" },
      { label: "Terminal", value: "xterm.js con soporte PTY completo" },
      { label: "Protocolo", value: "Integración MCP + LSP" },
    ],
    stackTitle: "Qué lo hace de calidad de producción",
    stack: [
      "Autenticación JWT con rotación de refresh token",
      "Configuraciones de seguridad por sesión (bloqueos de solo lectura, restricciones de raíz de escritura)",
      "Streaming via Server-Sent Events con recuperación total de errores",
      "Gestión de ventana de contexto y auto-compactación",
      "Conteo de tokens y seguimiento de costos en USD por mensaje",
      "Patrones de eliminación suave con marcas de tiempo de auditoría completas",
      "Superficie de API documentada con OpenAPI",
      "Monorepo Turborepo con tipos TypeScript compartidos",
    ],
    ctaTitle: "¿Listo para verlo en acción?",
    cta: "Abrir el workspace",
    cta2: "Ver precios",
  },
};

function getLocale(): "en" | "es" {
  if (typeof document === "undefined") return "en";
  return document.cookie.includes("locale=es") ? "es" : "en";
}

export default function ProductPage() {
  const t = copy[getLocale()];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pt-16 pb-16 text-center">
        <span className="badge mb-4 text-xs">{t.badge}</span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6 max-w-3xl mx-auto leading-[1.1]">
          {t.title}
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">{t.sub}</p>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-3xl px-4 pb-16">
        <div className="card-elevated p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-4">{t.missionTitle}</p>
          <p className="text-base leading-relaxed text-muted-foreground">{t.mission}</p>
        </div>
      </section>

      {/* Three pillars */}
      <section className="mx-auto max-w-6xl px-4 py-16 border-t border-border/30">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-10 text-center">{t.pillarsTitle}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {t.pillars.map((pillar) => (
            <div key={pillar.title} className="card p-6 hover:border-primary/30 transition-colors">
              <div className="text-3xl mb-4">{pillar.icon}</div>
              <h3 className="font-bold text-lg mb-3">{pillar.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className="mx-auto max-w-6xl px-4 py-16 border-t border-border/30">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">{t.techTitle}</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">{t.techDesc}</p>
            <div className="space-y-2">
              {t.techItems.map((item) => (
                <div key={item.label} className="flex items-center gap-4 py-2.5 border-b border-border/30 last:border-b-0">
                  <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider w-20 flex-shrink-0">{item.label}</span>
                  <span className="text-sm font-mono text-foreground/80">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">{t.stackTitle}</h2>
            <ul className="space-y-3">
              {t.stack.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 border-t border-border/30">
        <div className="card-elevated p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">{t.ctaTitle}</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/app" className="btn-primary text-base px-8 py-3 shadow-lg shadow-primary/20">{t.cta}</Link>
            <Link href="/pricing" className="btn-secondary text-base px-8 py-3">{t.cta2}</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
