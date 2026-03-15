"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

// ── i18n copy ─────────────────────────────────────────────────────────────────

const copy = {
  en: {
    badge: "Production-grade AI coding platform",
    headline1: "Code with intelligence.",
    headline2: "Ship with confidence.",
    sub: "MartinCoder is a repository-aware AI workspace that thinks before it acts. Plan safely, review clearly, execute precisely — built for serious developers and engineering teams.",
    cta1: "Open Workspace",
    cta2: "Explore Features",
    trusted: "Trusted workflows for",
    trustedItems: ["Local repositories", "Multi-file editing", "API integration", "Team delivery"],
    howTitle: "How MartinCoder works",
    howSub: "A deliberate, two-phase workflow that prevents mistakes before they happen.",
    steps: [
      { n: "01", title: "Describe your task", desc: "Write your intent in plain language. MartinCoder parses the repository context, identifies affected files, and maps dependencies." },
      { n: "02", title: "Review the interpretation", desc: "Before any code is generated, you see exactly what the AI understood: scope, files, risks, and assumptions. Approve or refine." },
      { n: "03", title: "Execute with precision", desc: "Only after your approval does the agent act. Changes are structured, tracked, and always visible — no surprises." },
    ],
    featTitle: "Everything a serious codebase needs",
    featSub: "Deep tooling, not shallow autocomplete. MartinCoder understands your project structure.",
    features: [
      { icon: "🔍", title: "Repository-aware context", desc: "Reads your entire project tree, understands file relationships, imports, and architecture before suggesting changes." },
      { icon: "✅", title: "Interpretation before execution", desc: "Every prompt goes through a confirmation phase. The AI explains what it understood before writing a single line." },
      { icon: "🗂️", title: "VS Code-style explorer", desc: "Navigate your project with a collapsible file tree. Open files, read contents, understand structure — all inside the workspace." },
      { icon: "🤖", title: "Multi-provider AI", desc: "Anthropic Claude, OpenAI GPT, Google Gemini, or local Ollama/LM Studio models — swap without losing your session." },
      { icon: "🛡️", title: "Plan mode / Build mode", desc: "Plan mode is read-only — safe for analysis and review. Build mode has full execution rights. Always your choice." },
      { icon: "⚡", title: "Live streaming with tool visibility", desc: "Watch every tool call as it happens. File reads, writes, bash commands — all visible in real time." },
      { icon: "💻", title: "Integrated terminal", desc: "Run commands, tests, and scripts without leaving the workspace. Full xterm.js terminal with session continuity." },
      { icon: "🌐", title: "English + Spanish", desc: "Full bilingual interface with natural translations. Language follows your preference across the entire platform." },
    ],
    usecasesTitle: "Built for real development work",
    usecases: [
      { title: "New feature implementation", desc: "Describe a feature, get a scoped implementation plan with file-level detail, then approve and execute." },
      { title: "Bug investigation & fix", desc: "Point to the bug or error. The AI traces the call path, identifies root cause, explains it, then patches with precision." },
      { title: "Code review & refactoring", desc: "Run in Plan mode to get a read-only analysis of any module — quality notes, smell detection, safe refactor suggestions." },
      { title: "Documentation generation", desc: "Select a module or file. Get structured, accurate documentation generated with understanding of the actual implementation." },
    ],
    statsTitle: "Designed for production",
    stats: [
      { n: "2-phase", label: "Interpret-then-execute flow" },
      { n: "4+", label: "AI providers supported" },
      { n: "8", label: "Built-in developer tools" },
      { n: "2", label: "Languages (EN + ES)" },
    ],
    faqTitle: "Common questions",
    faqs: [
      { q: "How is this different from GitHub Copilot or Cursor?", a: "MartinCoder focuses on deliberate, approval-gated workflows. It does not generate code until you confirm it understood your intent correctly. It is also self-hostable and provider-agnostic." },
      { q: "Can I use my own local models?", a: "Yes. MartinCoder supports Ollama and LM Studio out of the box. Point it to your local endpoint and choose your model from the settings." },
      { q: "Is the Plan mode truly read-only?", a: "Yes. In Plan mode, the agent cannot write files, run commands, or make changes. It can only read, analyze, and explain." },
      { q: "Does it support team collaboration?", a: "The Pro and Enterprise plans include multi-user support with shared sessions, role-based safety settings, and project isolation." },
      { q: "Can I run MartinCoder locally?", a: "Absolutely. The architecture supports full local deployment — database, API, and frontend can all run on your own infrastructure." },
    ],
    ctaTitle: "Ready to code with precision?",
    ctaSub: "Join developers who plan before they build, and build with confidence.",
    ctaBtn: "Start for free",
    ctaBtn2: "View pricing",
  },
  es: {
    badge: "Plataforma de codificación IA para producción",
    headline1: "Codifica con inteligencia.",
    headline2: "Entrega con confianza.",
    sub: "MartinCoder es un espacio de trabajo IA consciente del repositorio que razona antes de actuar. Planifica con seguridad, revisa con claridad, ejecuta con precisión — creado para desarrolladores serios y equipos de ingeniería.",
    cta1: "Abrir workspace",
    cta2: "Ver funcionalidades",
    trusted: "Flujos de trabajo confiables para",
    trustedItems: ["Repositorios locales", "Edición multi-archivo", "Integración de API", "Entrega en equipo"],
    howTitle: "Cómo funciona MartinCoder",
    howSub: "Un flujo de trabajo deliberado en dos fases que previene errores antes de que ocurran.",
    steps: [
      { n: "01", title: "Describe tu tarea", desc: "Escribe tu intención en lenguaje natural. MartinCoder analiza el contexto del repositorio, identifica archivos afectados y mapea dependencias." },
      { n: "02", title: "Revisa la interpretación", desc: "Antes de generar código, ves exactamente qué entendió la IA: alcance, archivos, riesgos y suposiciones. Aprueba o refina." },
      { n: "03", title: "Ejecuta con precisión", desc: "Solo después de tu aprobación actúa el agente. Los cambios son estructurados, rastreados y siempre visibles — sin sorpresas." },
    ],
    featTitle: "Todo lo que una base de código seria necesita",
    featSub: "Herramientas profundas, no autocompletado superficial. MartinCoder entiende la estructura de tu proyecto.",
    features: [
      { icon: "🔍", title: "Contexto consciente del repositorio", desc: "Lee todo el árbol del proyecto, entiende relaciones entre archivos, importaciones y arquitectura antes de sugerir cambios." },
      { icon: "✅", title: "Interpretación antes de ejecución", desc: "Cada prompt pasa por una fase de confirmación. La IA explica lo que entendió antes de escribir una sola línea." },
      { icon: "🗂️", title: "Explorador estilo VS Code", desc: "Navega tu proyecto con un árbol de archivos colapsable. Abre archivos, lee contenidos, entiende la estructura — todo dentro del workspace." },
      { icon: "🤖", title: "IA multi-proveedor", desc: "Anthropic Claude, OpenAI GPT, Google Gemini o modelos locales de Ollama/LM Studio — cambia sin perder tu sesión." },
      { icon: "🛡️", title: "Modo Plan / Modo Build", desc: "El modo Plan es de solo lectura — seguro para análisis y revisión. El modo Build tiene derechos de ejecución completos. Siempre tu elección." },
      { icon: "⚡", title: "Streaming en vivo con visibilidad de herramientas", desc: "Observa cada llamada a herramienta en tiempo real. Lecturas de archivos, escrituras, comandos bash — todo visible." },
      { icon: "💻", title: "Terminal integrado", desc: "Ejecuta comandos, pruebas y scripts sin salir del workspace. Terminal xterm.js completo con continuidad de sesión." },
      { icon: "🌐", title: "Inglés + Español", desc: "Interfaz bilingüe completa con traducciones naturales. El idioma sigue tu preferencia en toda la plataforma." },
    ],
    usecasesTitle: "Construido para trabajo de desarrollo real",
    usecases: [
      { title: "Implementación de nuevas funcionalidades", desc: "Describe una función, obtén un plan de implementación con detalle a nivel de archivo, luego aprueba y ejecuta." },
      { title: "Investigación y corrección de errores", desc: "Señala el bug o error. La IA rastrea el flujo de llamadas, identifica la causa raíz, la explica y luego aplica el parche con precisión." },
      { title: "Revisión de código y refactorización", desc: "Ejecuta en modo Plan para obtener un análisis de solo lectura de cualquier módulo — notas de calidad, detección de problemas, sugerencias de refactorización." },
      { title: "Generación de documentación", desc: "Selecciona un módulo o archivo. Obtén documentación estructurada y precisa generada con comprensión de la implementación real." },
    ],
    statsTitle: "Diseñado para producción",
    stats: [
      { n: "2 fases", label: "Flujo interpretar-luego-ejecutar" },
      { n: "4+", label: "Proveedores de IA compatibles" },
      { n: "8", label: "Herramientas integradas para desarrolladores" },
      { n: "2", label: "Idiomas (EN + ES)" },
    ],
    faqTitle: "Preguntas frecuentes",
    faqs: [
      { q: "¿En qué se diferencia de GitHub Copilot o Cursor?", a: "MartinCoder se enfoca en flujos de trabajo deliberados con aprobación obligatoria. No genera código hasta que confirmas que entendió correctamente tu intención. También es auto-alojable e independiente del proveedor." },
      { q: "¿Puedo usar mis propios modelos locales?", a: "Sí. MartinCoder es compatible con Ollama y LM Studio de forma nativa. Apúntalo a tu endpoint local y elige tu modelo desde la configuración." },
      { q: "¿El modo Plan es verdaderamente de solo lectura?", a: "Sí. En el modo Plan, el agente no puede escribir archivos, ejecutar comandos ni hacer cambios. Solo puede leer, analizar y explicar." },
      { q: "¿Admite colaboración en equipo?", a: "Los planes Pro y Enterprise incluyen soporte multiusuario con sesiones compartidas, configuraciones de seguridad basadas en roles y aislamiento de proyectos." },
      { q: "¿Puedo ejecutar MartinCoder localmente?", a: "Por supuesto. La arquitectura admite despliegue local completo — la base de datos, la API y el frontend pueden ejecutarse en tu propia infraestructura." },
    ],
    ctaTitle: "¿Listo para codificar con precisión?",
    ctaSub: "Únete a los desarrolladores que planifican antes de construir, y construyen con confianza.",
    ctaBtn: "Comenzar gratis",
    ctaBtn2: "Ver precios",
  },
};

function getLocale(): "en" | "es" {
  if (typeof document === "undefined") return "en";
  return document.cookie.includes("locale=es") ? "es" : "en";
}

// ── FAQ Accordion ─────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  const locale = getLocale();
  const t = copy[locale];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] opacity-20 dark:opacity-10"
            style={{ background: "radial-gradient(ellipse at center, hsl(142 65% 38%), transparent 70%)" }} />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-24">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="badge text-xs px-3 py-1 font-medium">{t.badge}</span>
          </div>

          {/* Headline */}
          <h1 className="text-center text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6">
            <span className="block">{t.headline1}</span>
            <span className="block gradient-text">{t.headline2}</span>
          </h1>

          {/* Sub */}
          <p className="text-center text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {t.sub}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <Link href="/app" className="btn-primary text-base px-7 py-3 shadow-lg shadow-primary/20 hover:shadow-primary/30">
              {t.cta1}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link href="/features" className="btn-secondary text-base px-7 py-3">
              {t.cta2}
            </Link>
          </div>

          {/* Trusted by chips */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground/60 mr-1">{t.trusted}</span>
            {t.trustedItems.map((item) => (
              <span key={item} className="text-xs px-3 py-1 rounded-full border border-border/50 bg-card/50 text-muted-foreground">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product preview mockup ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="relative rounded-2xl border border-border/60 bg-card/40 overflow-hidden shadow-2xl shadow-black/20">
          {/* Fake window chrome */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/50 bg-card/70">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-amber-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            <div className="ml-4 flex-1 max-w-xs mx-auto">
              <div className="bg-secondary/60 rounded-md px-3 py-1 text-[11px] text-muted-foreground/60 text-center">
                app.martincoder.io/workspace
              </div>
            </div>
          </div>

          {/* UI mock layout */}
          <div className="flex h-72 sm:h-96">
            {/* Sidebar mock */}
            <div className="w-48 sm:w-56 border-r border-border/40 bg-card/60 p-3 space-y-1 flex-shrink-0">
              <div className="shimmer h-5 w-28 rounded mb-3" />
              <div className="space-y-1">
                {["src/", "components/", "lib/", "app/page.tsx", "globals.css"].map((name) => (
                  <div key={name} className="flex items-center gap-1.5 text-[11px] px-1.5 py-1 rounded text-muted-foreground">
                    <span className="opacity-40">{name.endsWith("/") ? "📁" : "📄"}</span>
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat mock */}
            <div className="flex-1 p-4 space-y-3 overflow-hidden">
              {/* Interpretation card */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Interpretation</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </div>
                <div className="shimmer h-3 w-full rounded mb-1.5" />
                <div className="shimmer h-3 w-4/5 rounded mb-1.5" />
                <div className="shimmer h-3 w-3/5 rounded mb-3" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 rounded-lg bg-primary/80 shimmer" />
                  <div className="h-6 w-16 rounded-lg bg-secondary shimmer" />
                </div>
              </div>
              {/* Tool call mock */}
              <div className="rounded-lg border border-border/50 bg-card/50 p-2.5">
                <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                  <span className="text-emerald-500">✓</span>
                  <span>readFile("src/components/header.tsx")</span>
                </div>
              </div>
              {/* Response mock */}
              <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-card p-3 max-w-sm">
                <div className="shimmer h-3 w-full rounded mb-1.5" />
                <div className="shimmer h-3 w-5/6 rounded mb-1.5" />
                <div className="shimmer h-3 w-4/6 rounded" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 border-t border-border/30">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">{t.howTitle}</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t.howSub}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {t.steps.map((step) => (
            <div key={step.n} className="relative">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl font-bold text-primary/20 font-mono">{step.n}</span>
                <div className="flex-1 h-px bg-border/40" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 border-t border-border/30">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">{t.featTitle}</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t.featSub}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {t.features.map((feat) => (
            <div key={feat.title} className="card p-5 hover:border-primary/30 transition-colors group">
              <div className="text-2xl mb-3">{feat.icon}</div>
              <h3 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors">{feat.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 border-t border-border/30">
        <p className="text-center text-sm text-muted-foreground/60 mb-8 uppercase tracking-wider font-medium">{t.statsTitle}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {t.stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl font-bold gradient-text mb-1">{stat.n}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Use cases ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 border-t border-border/30">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">{t.usecasesTitle}</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {t.usecases.map((uc) => (
            <div key={uc.title} className="card-elevated p-6 hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1.5">{uc.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{uc.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-20 border-t border-border/30">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">{t.faqTitle}</h2>
        </div>
        <div className="space-y-3">
          {t.faqs.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 border-t border-border/30">
        <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden p-12 text-center">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 60% at 50% 0%, hsl(142 65% 38% / 0.08), transparent)" }} />
          <h2 className="relative text-3xl sm:text-4xl font-bold tracking-tight mb-4">{t.ctaTitle}</h2>
          <p className="relative text-muted-foreground text-lg mb-8 max-w-lg mx-auto">{t.ctaSub}</p>
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/app" className="btn-primary text-base px-8 py-3 shadow-lg shadow-primary/20">
              {t.ctaBtn}
            </Link>
            <Link href="/pricing" className="btn-secondary text-base px-8 py-3">
              {t.ctaBtn2}
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
