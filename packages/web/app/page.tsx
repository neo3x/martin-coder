"use client";

import Link from "next/link";
import { PageShell } from "@/components/marketing/page-shell";

const copy = {
  en: {
    headline: "Production-grade AI coding workspace",
    sub: "Plan safely, execute confidently, and ship faster with a repository-aware assistant built for real teams.",
    cta1: "Start in App",
    cta2: "View Features",
  },
  es: {
    headline: "Espacio de trabajo IA para desarrollo profesional",
    sub: "Planifica con seguridad, ejecuta con confianza y entrega más rápido con un asistente consciente del repositorio.",
    cta1: "Entrar a la app",
    cta2: "Ver funcionalidades",
  },
};

function locale() {
  if (typeof document === "undefined") return "en";
  return document.cookie.includes("locale=es") ? "es" : "en";
}

export default function Landing() {
  const t = copy[locale() as "en" | "es"];
  return (
    <PageShell>
      <section className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="badge mb-3">MartinCoder Platform</p>
          <h1 className="text-4xl font-semibold tracking-tight mb-4">{t.headline}</h1>
          <p className="text-muted-foreground text-lg mb-6">{t.sub}</p>
          <div className="flex gap-3">
            <Link className="btn-primary" href="/app">{t.cta1}</Link>
            <Link className="btn-secondary" href="/features">{t.cta2}</Link>
          </div>
        </div>
        <div className="card-elevated p-6">
          <h2 className="font-medium mb-3">Operational cockpit</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Dual modes: Plan (read-only) and Build (execution)</li>
            <li>• Permission-first workflows and transparent tool activity</li>
            <li>• Session continuity, context reuse, and repository controls</li>
            <li>• Multi-provider AI with local and cloud deployment paths</li>
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
