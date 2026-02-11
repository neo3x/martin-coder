# Auditoría funcional y visual del proyecto Martin-Coder

Fecha: 2026-02-11

## Alcance de la revisión

Se revisaron los tres módulos principales del monorepo:

- `apps/web` (frontend Next.js)
- `apps/api` (backend FastAPI)
- `apps/cli` (CLI en Python)

La auditoría combina:

1. **Ejecución de checks técnicos** (build/typecheck/tests cuando fue posible).
2. **Inspección de estructura y código** para detectar problemas funcionales, visuales y de mantenibilidad.
3. **Verificación de recursos/documentación** referenciados por el proyecto.

---

## Resumen ejecutivo

Estado general: **no está listo para producción en su estado actual**.

Hallazgos críticos:

1. El frontend no compila por módulos faltantes (`@/lib/api` y múltiples stores Zustand).
2. El frontend tiene errores TypeScript adicionales (`implicit any`) en componentes clave.
3. La configuración actual depende de `next/font/google` (Inter), lo que bloquea el build en entornos sin salida a internet.
4. El script de lint de Next.js no es reproducible en CI porque intenta abrir el asistente interactivo de configuración.
5. No se pudieron ejecutar tests de API/CLI por dependencias de Python no instaladas y sin acceso de red para descargarlas.
6. El README referencia recursos inexistentes (logo y documentación de configuración).

---

## Problemas funcionales detectados

## 1) Frontend no compilable (CRÍTICO)

**Impacto:** la aplicación web no puede generar build de producción.

**Evidencia técnica:** `npm run build` falla por módulos inexistentes y por fuente remota.

Errores observados:

- `Module not found: Can't resolve '@/lib/stores/auth-store'`
- `Module not found: Can't resolve '@/lib/stores/chat-store'`
- `Module not found: Can't resolve '@/lib/stores/model-store'`
- `Module not found: Can't resolve '@/lib/stores/theme-store'`
- `Module not found: Can't resolve '@/lib/api'`

**Causa probable:** el código importa stores/API que no existen en el árbol actual (`apps/web/lib` sólo contiene `language-store.ts`).

---

## 2) Errores TypeScript en componentes activos (ALTO)

**Impacto:** incluso corrigiendo imports, persisten errores de tipado que rompen `tsc --noEmit`.

**Evidencia técnica:** `npx tsc --noEmit` reporta múltiples `TS7006` (parámetros implícitamente `any`) en:

- `components/chat/chat-panel.tsx`
- `components/layout/header.tsx`
- `components/layout/sidebar.tsx`
- `components/providers.tsx`

---

## 3) Build no resiliente en entornos offline/restringidos (ALTO)

**Impacto:** despliegues en redes corporativas cerradas o CI sin internet fallan.

**Evidencia técnica:** `next build` intenta descargar `Inter` desde Google Fonts y aborta tras reintentos.

**Causa:** uso directo de `next/font/google` en `app/layout.tsx`.

---

## 4) Pipeline de lint incompleto/no automatizable (MEDIO)

**Impacto:** no existe lint reproducible para CI/CD de frontend.

**Evidencia técnica:** `npm run lint` abre prompt interactivo de configuración de ESLint en vez de ejecutar reglas.

**Causa:** falta archivo de configuración ESLint ya inicializado para el proyecto Next.js.

---

## 5) Tests de backend no ejecutables en entorno limpio sin lock de dependencias (ALTO)

**Impacto:** no se puede validar regresiones automáticamente en este entorno.

**Evidencia técnica:**

- `pytest` falla por `ModuleNotFoundError: No module named 'pytest_asyncio'`.
- `pip install -r requirements.txt` falla por incapacidad de resolver/descargar paquetes (`fastapi==0.109.2`) debido al proxy/red.

**Observación:** esto mezcla dos problemas: entorno restringido + ausencia de estrategia offline (wheelhouse, lockfile reproducible o imagen preconstruida para tests).

---

## 6) CLI no ejecutable sin bootstrap de dependencias (MEDIO)

**Impacto:** `martin_coder` no inicia en entorno Python base.

**Evidencia técnica:** `python3 -m apps.cli.martin_coder.main --help` falla por falta de `typer`.

**Observación:** no se detectó una ruta de instalación offline o entorno empaquetado para CLI en esta revisión.

---

## Problemas visuales / UX detectados (por inspección)

## 7) UI principal con textos hardcoded en inglés y sin uso consistente de i18n (MEDIO)

**Impacto:** experiencia inconsistente para usuarios en español y degradación de localización.

**Ejemplos observables en `app/page.tsx`:**

- Tooltips y títulos de botones: `"Show Terminal"`, `"Hide Terminal"`, `"Show Editor"`, `"Hide Editor"`.
- Atajos e indicadores también en inglés.

**Nota:** el proyecto sí tiene archivos de mensajes (`apps/web/messages/en.json` y `es.json`) pero no se aprovechan de forma uniforme en los componentes revisados.

---

## 8) Riesgo de inconsistencia visual por breakpoints rígidos (MEDIO)

**Impacto:** potenciales problemas de layout en pantallas intermedias.

**Evidencia por código:** ancho fijo/semifijo para panel editor (`lg:w-[420px]`, `lg:min-w-[360px]`) combinado con paneles conmutables y FABs flotantes.

**Riesgo UX:** en resoluciones laptop pequeñas puede producirse sensación de “apretado”, truncado o jerarquía visual poco clara.

> Este punto requiere validación visual con ejecución del frontend; actualmente bloqueada por errores de compilación descritos arriba.

---

## Problemas de documentación y consistencia del proyecto

## 9) README con referencias rotas (MEDIO)

**Impacto:** onboarding dañado y pérdida de confianza inicial.

Hallazgos:

- Imagen `docs/assets/logo.png` referenciada pero ausente.
- Enlaces a configuración (`docs/en/configuration.md`) referenciados pero ausentes.

---

## 10) Requisitos de versión vs entorno real (OBSERVACIÓN)

**Impacto:** potencial fricción al ejecutar localmente.

Observación de esta revisión:

- README indica Python 3.11+.
- El entorno de ejecución disponible reportó Python 3.10.19.

Esto no es necesariamente un bug del repositorio, pero sí un punto importante para robustecer scripts de verificación (preflight checks con mensajes claros).

---

## Priorización sugerida (orden de trabajo)

1. **Restaurar `apps/web/lib` faltante** (stores + cliente API) para recuperar compilación.
2. **Corregir tipado TypeScript** (`noImplicitAny`) y establecer baseline de calidad.
3. **Resolver dependencia de fuente remota** (usar fuente local o fallback robusto para build offline).
4. **Cerrar configuración ESLint** con archivo no interactivo y script CI.
5. **Formalizar estrategia de dependencias Python** (lockfile/imagen base/wheelhouse) para ejecutar tests en entornos restringidos.
6. **Corregir documentación rota** y alinear README con estado real del repo.
7. **Unificar i18n en frontend** para eliminar textos hardcoded y evitar mezcla de idiomas.
8. **Ejecutar QA visual final** (responsive + accesibilidad) cuando la app compile.

---

## Checks ejecutados durante la auditoría

- `cd apps/api && pytest -q` → falla por dependencia faltante (`pytest_asyncio`).
- `python3 -m pip install -r apps/api/requirements.txt` → falla por restricciones de red/proxy.
- `cd apps/web && npm run lint` → prompt interactivo de inicialización ESLint.
- `cd apps/web && npm run build` → falla por módulos faltantes + descarga de fuente Google.
- `python3 -m compileall apps/api/app apps/cli/martin_coder` → exitoso (sin errores de sintaxis).
- `cd apps/web && npx tsc --noEmit` → falla por módulos faltantes y errores de tipado.
- `python3 -m apps.cli.martin_coder.main --help` → falla por dependencia faltante (`typer`).

