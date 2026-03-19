"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

const copy = {
  en: {
    badge: "Simple, transparent pricing",
    title: "Start free. Scale when ready.",
    sub: "No feature gates that frustrate. All core capabilities are available on the free tier. Upgrade for teams and enterprise needs.",
    billingMonthly: "Monthly",
    billingYearly: "Yearly",
    yearlySave: "Save 20%",
    plans: [
      {
        name: "Starter",
        price: { monthly: "$0", yearly: "$0" },
        period: "forever free",
        desc: "For individual developers getting started with AI-assisted coding.",
        badge: null,
        features: [
          "Full workspace with chat + editor + terminal",
          "Plan mode (read-only AI analysis)",
          "Build mode (AI execution)",
          "Interpretation/approval flow",
          "VS Code-style file explorer",
          "Local model support (Ollama, LM Studio)",
          "1 AI provider (Anthropic, OpenAI, or Google)",
          "5 active sessions",
          "Community support",
        ],
        cta: "Get started free",
        href: "/app",
        highlight: false,
      },
      {
        name: "Pro",
        price: { monthly: "$29", yearly: "$23" },
        period: "per month",
        desc: "For power users who need multiple providers, more sessions, and deeper integrations.",
        badge: "Most popular",
        features: [
          "Everything in Starter",
          "All AI providers (unlimited switching)",
          "Unlimited active sessions",
          "Session history and export",
          "MCP (Model Context Protocol) support",
          "LSP (Language Server Protocol) support",
          "GitHub integration",
          "Priority streaming (faster responses)",
          "Email support",
        ],
        cta: "Start Pro trial",
        href: "/app",
        highlight: true,
      },
      {
        name: "Enterprise",
        price: { monthly: "Custom", yearly: "Custom" },
        period: "contact us",
        desc: "For teams and organizations that need collaboration, compliance, and control.",
        badge: null,
        features: [
          "Everything in Pro",
          "Multi-user workspaces",
          "Role-based safety settings",
          "Shared session library",
          "SSO / SAML authentication",
          "Audit logs",
          "Self-hosted deployment option",
          "Custom model endpoints",
          "Dedicated support + SLA",
        ],
        cta: "Talk to sales",
        href: "#",
        highlight: false,
      },
    ],
    faq: "Frequently asked questions",
    faqs: [
      { q: "Is the free tier truly free forever?", a: "Yes. The Starter plan is free with no time limit. You get the full workspace including the interpretation/approval flow, VS Code-style explorer, and both Plan and Build modes." },
      { q: "Can I use local models on the free plan?", a: "Yes. Local models (Ollama, LM Studio) are fully supported on all plans including Starter. You control your own API costs." },
      { q: "What happens when I hit the session limit?", a: "On the Starter plan, you can have up to 5 active sessions. You can always delete old sessions to make room. Pro removes this limit entirely." },
      { q: "Is self-hosting available?", a: "Self-hosting is available on the Enterprise plan. The architecture supports full local deployment — database, API, and frontend on your own infrastructure." },
      { q: "What payment methods are accepted?", a: "We accept all major credit cards and bank transfers for Enterprise. Billing is handled securely and you can cancel at any time." },
    ],
    guarantee: "30-day money-back guarantee on all paid plans.",
  },
  es: {
    badge: "Precios simples y transparentes",
    title: "Comienza gratis. Escala cuando estés listo.",
    sub: "Sin restricciones de funcionalidades que frustren. Todas las capacidades principales están disponibles en el nivel gratuito. Actualiza para necesidades de equipos y empresas.",
    billingMonthly: "Mensual",
    billingYearly: "Anual",
    yearlySave: "Ahorra 20%",
    plans: [
      {
        name: "Starter",
        price: { monthly: "$0", yearly: "$0" },
        period: "gratis para siempre",
        desc: "Para desarrolladores individuales que comienzan con codificación asistida por IA.",
        badge: null,
        features: [
          "Workspace completo con chat + editor + terminal",
          "Modo Plan (análisis IA de solo lectura)",
          "Modo Build (ejecución con IA)",
          "Flujo de interpretación/aprobación",
          "Explorador de archivos estilo VS Code",
          "Soporte de modelos locales (Ollama, LM Studio)",
          "1 proveedor de IA (Anthropic, OpenAI o Google)",
          "5 sesiones activas",
          "Soporte de comunidad",
        ],
        cta: "Comenzar gratis",
        href: "/app",
        highlight: false,
      },
      {
        name: "Pro",
        price: { monthly: "$29", yearly: "$23" },
        period: "por mes",
        desc: "Para usuarios avanzados que necesitan múltiples proveedores, más sesiones e integraciones más profundas.",
        badge: "Más popular",
        features: [
          "Todo lo de Starter",
          "Todos los proveedores de IA (cambio ilimitado)",
          "Sesiones activas ilimitadas",
          "Historial y exportación de sesiones",
          "Soporte MCP (Model Context Protocol)",
          "Soporte LSP (Language Server Protocol)",
          "Integración con GitHub",
          "Streaming prioritario (respuestas más rápidas)",
          "Soporte por correo electrónico",
        ],
        cta: "Iniciar prueba Pro",
        href: "/app",
        highlight: true,
      },
      {
        name: "Enterprise",
        price: { monthly: "Personalizado", yearly: "Personalizado" },
        period: "contáctanos",
        desc: "Para equipos y organizaciones que necesitan colaboración, cumplimiento normativo y control.",
        badge: null,
        features: [
          "Todo lo de Pro",
          "Workspaces multiusuario",
          "Configuraciones de seguridad basadas en roles",
          "Biblioteca de sesiones compartidas",
          "Autenticación SSO / SAML",
          "Registros de auditoría",
          "Opción de despliegue auto-alojado",
          "Endpoints de modelos personalizados",
          "Soporte dedicado + SLA",
        ],
        cta: "Hablar con ventas",
        href: "#",
        highlight: false,
      },
    ],
    faq: "Preguntas frecuentes",
    faqs: [
      { q: "¿El nivel gratuito es realmente gratis para siempre?", a: "Sí. El plan Starter es gratuito sin límite de tiempo. Obtienes el workspace completo incluyendo el flujo de interpretación/aprobación, el explorador estilo VS Code y los modos Plan y Build." },
      { q: "¿Puedo usar modelos locales en el plan gratuito?", a: "Sí. Los modelos locales (Ollama, LM Studio) son totalmente compatibles con todos los planes, incluido Starter. Tú controlas tus propios costos de API." },
      { q: "¿Qué pasa cuando alcanzo el límite de sesiones?", a: "En el plan Starter, puedes tener hasta 5 sesiones activas. Siempre puedes eliminar sesiones antiguas para hacer espacio. Pro elimina este límite por completo." },
      { q: "¿Está disponible el auto-alojamiento?", a: "El auto-alojamiento está disponible en el plan Enterprise. La arquitectura admite despliegue local completo — base de datos, API y frontend en tu propia infraestructura." },
      { q: "¿Qué métodos de pago se aceptan?", a: "Aceptamos todas las tarjetas de crédito principales y transferencias bancarias para Enterprise. La facturación se maneja de forma segura y puedes cancelar en cualquier momento." },
    ],
    guarantee: "Garantía de devolución de dinero de 30 días en todos los planes de pago.",
  },
};

function getLocale(): "en" | "es" {
  if (typeof document === "undefined") return "en";
  return document.cookie.includes("locale=es") ? "es" : "en";
}

type BillingCycle = "monthly" | "yearly";

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/30 transition-colors"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="font-medium text-sm pr-4">{q}</span>
        <span className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-transform duration-200 ${open ? "rotate-45" : ""}`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  const t = copy[getLocale()];
  const [billing, setBilling] = useState<BillingCycle>("monthly");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-14 text-center">
        <span className="badge mb-4 text-xs">{t.badge}</span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">{t.title}</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8 leading-relaxed">{t.sub}</p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-secondary/50 border border-border/40">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${billing === "monthly" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.billingMonthly}
          </button>
          <button
            type="button"
            onClick={() => setBilling("yearly")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${billing === "yearly" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.billingYearly}
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/15 text-primary font-semibold">{t.yearlySave}</span>
          </button>
        </div>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {t.plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-7 flex flex-col gap-6 ${
                plan.highlight
                  ? "border-primary/50 bg-gradient-to-b from-primary/5 to-card shadow-xl shadow-primary/10"
                  : "border-border/50 bg-card"
              }`}
            >
              {/* Popular badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="badge text-[11px] px-3 py-1 shadow-sm">{plan.badge}</span>
                </div>
              )}

              {/* Header */}
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">{plan.name}</p>
                <div className="flex items-end gap-1 mb-2">
                  <span className={`text-4xl font-bold tracking-tight ${plan.highlight ? "text-primary" : ""}`}>
                    {billing === "yearly" ? plan.price.yearly : plan.price.monthly}
                  </span>
                  {plan.price.monthly !== "Custom" && plan.price.monthly !== "Personalizado" && (
                    <span className="text-sm text-muted-foreground mb-1">/{plan.period}</span>
                  )}
                </div>
                {(plan.price.monthly === "Custom" || plan.price.monthly === "Personalizado") && (
                  <p className="text-sm text-muted-foreground">{plan.period}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{plan.desc}</p>
              </div>

              {/* CTA */}
              <Link
                href={plan.href}
                className={plan.highlight ? "btn-primary text-center" : "btn-secondary text-center"}
              >
                {plan.cta}
              </Link>

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm">
                    <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-muted-foreground">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <p className="text-center text-sm text-muted-foreground/60 mt-8 flex items-center justify-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          {t.guarantee}
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20 border-t border-border/30">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-10 text-center">{t.faq}</h2>
        <div className="space-y-3">
          {t.faqs.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
