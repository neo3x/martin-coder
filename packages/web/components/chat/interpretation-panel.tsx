"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface InterpretationResult {
  summary: string;
  scope: string;
  files: string[];
  risks: string[];
  assumptions: string[];
  mode: "plan" | "build";
}

interface InterpretationPanelProps {
  interpretation: InterpretationResult;
  onApprove: () => void;
  onRefine: (refinedPrompt: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InterpretationPanel({
  interpretation,
  onApprove,
  onRefine,
  onCancel,
  isLoading = false,
}: InterpretationPanelProps) {
  const [showRefine, setShowRefine] = useState(false);
  const [refineText, setRefineText] = useState("");

  const handleRefine = () => {
    if (!refineText.trim()) return;
    onRefine(refineText.trim());
    setRefineText("");
    setShowRefine(false);
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-primary/15 bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Interpretation
          </span>
        </div>
        <div className={`ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium ${
          interpretation.mode === "build"
            ? "bg-amber-500/10 text-amber-500"
            : "bg-blue-500/10 text-blue-400"
        }`}>
          {interpretation.mode === "build" ? (
            <>
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Build mode
            </>
          ) : (
            <>
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Plan mode
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Summary */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Understood as
          </p>
          <p className="text-sm leading-relaxed">{interpretation.summary}</p>
        </div>

        {/* Scope */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Scope
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">{interpretation.scope}</p>
        </div>

        {/* Files to touch */}
        {interpretation.files.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Files likely affected
            </p>
            <div className="space-y-1">
              {interpretation.files.map((file) => (
                <div key={file} className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-secondary/40 rounded-lg px-2.5 py-1.5">
                  <svg className="w-3 h-3 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="truncate">{file}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risks */}
        {interpretation.risks.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">
              Risks / considerations
            </p>
            <div className="space-y-1.5">
              {interpretation.risks.map((risk) => (
                <div key={risk} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <svg className="w-3 h-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {risk}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assumptions */}
        {interpretation.assumptions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Assumptions
            </p>
            <div className="space-y-1.5">
              {interpretation.assumptions.map((assumption) => (
                <div key={assumption} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <svg className="w-3 h-3 flex-shrink-0 mt-0.5 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {assumption}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Refine input */}
        {showRefine && (
          <div className="animate-slide-down space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Refine your request
            </p>
            <textarea
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              placeholder="Clarify what you meant, add constraints, or change scope..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRefine}
                disabled={!refineText.trim()}
                className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
              >
                Re-interpret
              </button>
              <button
                type="button"
                onClick={() => { setShowRefine(false); setRefineText(""); }}
                className="btn-ghost text-xs px-4 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showRefine && (
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onApprove}
              disabled={isLoading}
              className="btn-primary text-sm px-5 py-2 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Executing…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve &amp; Execute
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowRefine(true)}
              disabled={isLoading}
              className="btn-secondary text-sm px-4 py-2 disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Refine
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="btn-ghost text-sm px-3 py-2 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Interpreting placeholder ───────────────────────────────────────────────────

export function InterpretingPlaceholder() {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 animate-slide-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
          Interpreting your request…
        </span>
      </div>
      <div className="space-y-2">
        <div className="shimmer h-3 w-full rounded" />
        <div className="shimmer h-3 w-4/5 rounded" />
        <div className="shimmer h-3 w-3/5 rounded" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="shimmer h-8 w-28 rounded-lg" />
        <div className="shimmer h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}
