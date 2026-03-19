"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

const copy = {
  en: {
    badge: "Platform capabilities",
    title: "Built different.",
    sub: "MartinCoder combines deliberate AI reasoning, VS Code-level project awareness, and a production-grade safety model into a unified coding workspace.",
    sections: [
      {
        tag: "Core workflow",
        title: "Interpret, confirm, then execute",
        desc: "Every request goes through a structured two-phase flow. The AI parses your intent, maps it to your codebase, explains its plan — and waits for your approval before doing anything.",
        points: [
          "Prompt interpretation with scope identification",
          "File-level impact preview before changes",
          "Risk and assumption surfacing",
          "Approval gate — you decide when to proceed",
          "Clear distinction between planning and doing",
        ],
      },
      {
        tag: "Repository intelligence",
        title: "Understands your entire project",
        desc: "MartinCoder reads your full project tree, traces imports, understands module relationships, and maintains context across multi-file edits.",
        points: [
          "Full directory traversal and file reading",
          "Import and dependency graph awareness",
          "Multi-file edit coordination",
          "Context persistence across sessions",
          "Safe path resolution and write validation",
        ],
      },
      {
        tag: "Project explorer",
        title: "VS Code-style file tree",
        desc: "Navigate your local project like a real IDE. Collapsible folders, file type icons, clickable files — all synchronized with the editor and the AI context.",
        points: [
          "Collapsible folder tree with depth control",
          "File type icons for quick scanning",
          "Click-to-open with Monaco editor",
          "Sidebar-integrated, always visible",
          "Synced with AI file context",
        ],
      },
      {
        tag: "Agent modes",
        title: "Plan mode and Build mode",
        desc: "Two distinct operational modes give you full control over what the AI is allowed to do in any given session.",
        points: [
          "Plan mode: read-only, safe for analysis and review",
          "Build mode: full read/write and execution rights",
          "Per-session mode selection",
          "Mode indicator always visible",
          "Granular tool permission control",
        ],
      },
      {
        tag: "AI providers",
        title: "Multi-provider, model-agnostic",
        desc: "Use the best model for the job. Switch between cloud providers or run fully local with Ollama or LM Studio — no lock-in.",
        points: [
          "Anthropic Claude (Opus, Sonnet, Haiku)",
          "OpenAI GPT-4o and GPT-4 Turbo",
          "Google Gemini 2.0 Flash and 1.5 Pro",
          "Ollama local models (llama3, codellama, mistral)",
          "LM Studio custom endpoints",
        ],
      },
      {
        tag: "Developer tooling",
        title: "Everything in one workspace",
        desc: "Integrated terminal, Monaco code editor, streaming tool visibility, and real-time session continuity — no context switching needed.",
        points: [
          "Full xterm.js terminal with command history",
          "Monaco editor with syntax highlighting",
          "Streaming tool call transparency",
          "Git status, diff, and commit support",
          "Web search and code search tools",
        ],
      },
    ],
    tableTitle: "Capability comparison",
    tableHeaders: ["Feature", "MartinCoder", "Cursor", "GitHub Copilot"],
    tableRows: [
      ["Interpret before execute", "✅", "Partial", "No"],
      ["Approval gate workflow", "✅", "No", "No"],
      ["VS Code file explorer", "✅", "✅", "✅"],
      ["Read-only plan mode", "✅", "No", "No"],
      ["Local model support", "✅", "Limited", "No"],
      ["Self-hostable", "✅", "No", "No"],
      ["Multi-provider AI", "✅", "Limited", "No"],
      ["Integrated terminal", "✅", "✅", "No"],
    ],
    cta: "Start using MartinCoder",
    ctaSub: "All features available from day one.",
  },
  es: {
    badge: "Capacidades de la plataforma",
    title: "Construido diferente.",
    sub: "MartinCoder combina razonamiento de IA deliberado, consciencia de proyectos al nivel de VS Code, y un modelo de seguridad de calidad de producción en un workspace unificado.",
    sections: [
      {
        tag: "Flujo principal",
        title: "Interpretar, confirmar, luego ejecutar",
        desc: "Cada solicitud pasa por un flujo estructurado de dos fases. La IA analiza tu intención, la mapea en tu base de código, explica su plan — y espera tu aprobación antes de hacer cualquier cosa.",
        points: [
          "Interpretación del prompt con identificación de alcance",
          "Vista previa del impacto a nivel de archivo antes de los cambios",
          "Exposición de riesgos y suposiciones",
          "Compuerta de aprobación — tú decides cuándo proceder",
          "Clara distinción entre planificación y ejecución",
        ],
      },
      {
        tag: "Inteligencia del repositorio",
        title: "Entiende todo tu proyecto",
        desc: "MartinCoder lee todo tu árbol de proyecto, rastrea importaciones, entiende relaciones entre módulos y mantiene contexto en ediciones multi-archivo.",
        points: [
          "Traversal completo del directorio y lectura de archivos",
          "Consciencia del gráfico de importaciones y dependencias",
          "Coordinación de edición multi-archivo",
          "Persistencia de contexto entre sesiones",
          "Resolución segura de rutas y validación de escritura",
        ],
      },
      {
        tag: "Explorador de proyecto",
        title: "Árbol de archivos estilo VS Code",
        desc: "Navega tu proyecto local como un IDE real. Carpetas colapsables, iconos de tipo de archivo, archivos clicables — todo sincronizado con el editor y el contexto de la IA.",
        points: [
          "Árbol de carpetas colapsable con control de profundidad",
          "Iconos de tipo de archivo para escaneo rápido",
          "Clic para abrir con editor Monaco",
          "Integrado en la barra lateral, siempre visible",
          "Sincronizado con contexto de archivos de la IA",
        ],
      },
      {
        tag: "Modos de agente",
        title: "Modo Plan y Modo Build",
        desc: "Dos modos operativos distintos te dan control total sobre lo que se permite hacer a la IA en cualquier sesión.",
        points: [
          "Modo Plan: solo lectura, seguro para análisis y revisión",
          "Modo Build: derechos completos de lectura/escritura y ejecución",
          "Selección de modo por sesión",
          "Indicador de modo siempre visible",
          "Control granular de permisos de herramientas",
        ],
      },
      {
        tag: "Proveedores de IA",
        title: "Multi-proveedor, agnóstico de modelo",
        desc: "Usa el mejor modelo para cada trabajo. Cambia entre proveedores en la nube o ejecuta completamente local con Ollama o LM Studio — sin bloqueo de proveedor.",
        points: [
          "Anthropic Claude (Opus, Sonnet, Haiku)",
          "OpenAI GPT-4o y GPT-4 Turbo",
          "Google Gemini 2.0 Flash y 1.5 Pro",
          "Modelos locales Ollama (llama3, codellama, mistral)",
          "Endpoints personalizados de LM Studio",
        ],
      },
      {
        tag: "Herramientas para desarrolladores",
        title: "Todo en un workspace",
        desc: "Terminal integrado, editor Monaco, visibilidad de herramientas en streaming y continuidad de sesión en tiempo real — sin cambio de contexto.",
        points: [
          "Terminal xterm.js completo con historial de comandos",
          "Editor Monaco con resaltado de sintaxis",
          "Transparencia de llamadas a herramientas en streaming",
          "Soporte de git status, diff y commit",
          "Búsqueda web y búsqueda en código",
        ],
      },
    ],
    tableTitle: "Comparación de capacidades",
    tableHeaders: ["Característica", "MartinCoder", "Cursor", "GitHub Copilot"],
    tableRows: [
      ["Interpretar antes de ejecutar", "✅", "Parcial", "No"],
      ["Flujo con compuerta de aprobación", "✅", "No", "No"],
      ["Explorador de archivos VS Code", "✅", "✅", "✅"],
      ["Modo plan de solo lectura", "✅", "No", "No"],
      ["Soporte de modelos locales", "✅", "Limitado", "No"],
      ["Auto-alojable", "✅", "No", "No"],
      ["IA multi-proveedor", "✅", "Limitado", "No"],
      ["Terminal integrado", "✅", "✅", "No"],
    ],
    cta: "Empezar a usar MartinCoder",
    ctaSub: "Todas las funcionalidades disponibles desde el primer día.",
  },
};

function getLocale(): "en" | "es" {
  if (typeof document === "undefined") return "en";
  return document.cookie.includes("locale=es") ? "es" : "en";
}

export default function FeaturesPage() {
  const t = copy[getLocale()];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-14 text-center">
        <span className="badge mb-4 text-xs">{t.badge}</span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
          {t.title}
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">{t.sub}</p>
      </section>

      {/* Feature sections */}
      <section className="mx-auto max-w-6xl px-4 py-6 space-y-20">
        {t.sections.map((sec, i) => (
          <div key={sec.tag} className={`grid lg:grid-cols-2 gap-10 items-start ${i % 2 === 1 ? "lg:grid-flow-dense" : ""}`}>
            {/* Text */}
            <div className={i % 2 === 1 ? "lg:col-start-2" : ""}>
              <span className="badge mb-3 text-xs">{sec.tag}</span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">{sec.title}</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">{sec.desc}</p>
              <ul className="space-y-2.5">
                {sec.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5 text-sm">
                    <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-muted-foreground">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual card */}
            <div className={`card-elevated p-6 ${i % 2 === 1 ? "lg:col-start-1 lg:row-start-1" : ""}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className="w-2 h-2 rounded-full bg-primary/40" />
                <div className="w-2 h-2 rounded-full bg-primary/20" />
                <span className="ml-2 text-xs font-mono text-muted-foreground/60">{sec.tag}</span>
              </div>
              <div className="space-y-2.5">
                {sec.points.slice(0, 4).map((pt, pi) => (
                  <div key={pt} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border/30">
                    <span className="text-[11px] font-mono text-muted-foreground/50 w-4">{String(pi + 1).padStart(2, "0")}</span>
                    <span className="text-xs text-foreground/80">{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-4xl px-4 py-20 border-t border-border/30">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-10 text-center">{t.tableTitle}</h2>
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                {t.tableHeaders.map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-left font-semibold text-sm ${i === 1 ? "text-primary" : "text-foreground"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.tableRows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/30 last:border-b-0 hover:bg-accent/20 transition-colors">
                  {row.map((cell, ci) => (
                    <td key={ci} className={`px-4 py-3 ${ci === 0 ? "text-muted-foreground" : ci === 1 ? "text-primary font-medium" : "text-muted-foreground/60"}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 border-t border-border/30">
        <div className="card-elevated p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">{t.cta}</h2>
          <p className="text-muted-foreground mb-8">{t.ctaSub}</p>
          <Link href="/app" className="btn-primary text-base px-8 py-3 shadow-lg shadow-primary/20">{t.cta}</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
