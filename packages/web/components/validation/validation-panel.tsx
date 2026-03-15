"use client";

import { useState } from "react";
import type { ValidationReport } from "@martin-coder/shared";

interface ValidationResult {
  toolType: string;
  toolCommand: string;
  passed: boolean;
  errorCount: number;
  warningCount: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

interface ValidationPanelProps {
  results: ValidationResult[];
  summary?: ValidationReport;
  isRunning?: boolean;
}

function ToolIcon({ type }: { type: string }) {
  if (type === "typecheck") {
    return (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    );
  }
  if (type === "lint") {
    return (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (type === "test") {
    return (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
  );
}

function ValidationResultCard({ result }: { result: ValidationResult }) {
  const [expanded, setExpanded] = useState(!result.passed && result.errorCount > 0);

  const hasOutput = !!(result.stderr || result.stdout);
  const duration = result.durationMs < 1000
    ? `${result.durationMs}ms`
    : `${(result.durationMs / 1000).toFixed(1)}s`;

  return (
    <div
      className={`rounded-lg border overflow-hidden ${
        result.passed
          ? "border-green-500/15 bg-green-500/3"
          : "border-red-500/15 bg-red-500/3"
      }`}
    >
      <div
        className={`flex items-center gap-2 px-3 py-2 ${hasOutput ? "cursor-pointer" : ""}`}
        onClick={() => hasOutput && setExpanded(!expanded)}
      >
        {/* Status icon */}
        <div
          className={`flex-shrink-0 ${result.passed ? "text-green-500" : "text-red-400"}`}
        >
          {result.passed ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        {/* Tool icon */}
        <div className="text-muted-foreground/50">
          <ToolIcon type={result.toolType} />
        </div>

        {/* Label */}
        <span className="flex-1 text-xs font-medium text-foreground">
          {result.toolType}
        </span>

        {/* Command */}
        <code className="text-[10px] text-muted-foreground/40 truncate max-w-32 hidden sm:block">
          {result.toolCommand}
        </code>

        {/* Counts */}
        {result.errorCount > 0 && (
          <span className="text-[10px] text-red-400 tabular-nums flex-shrink-0">
            {result.errorCount} error{result.errorCount !== 1 ? "s" : ""}
          </span>
        )}
        {result.warningCount > 0 && (
          <span className="text-[10px] text-amber-400/70 tabular-nums flex-shrink-0">
            {result.warningCount} warn
          </span>
        )}

        {/* Duration */}
        <span className="text-[10px] text-muted-foreground/30 tabular-nums flex-shrink-0">
          {duration}
        </span>

        {/* Expand toggle */}
        {hasOutput && (
          <svg
            className={`w-3 h-3 text-muted-foreground/30 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {/* Output */}
      {expanded && hasOutput && (
        <div className="border-t border-border/20 bg-black/20">
          <pre className="p-3 text-[10px] font-mono text-foreground/70 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
            {(result.stderr || result.stdout).slice(0, 2000)}
            {(result.stderr + result.stdout).length > 2000 && "\n…(truncated)"}
          </pre>
        </div>
      )}
    </div>
  );
}

export function ValidationPanel({ results, summary, isRunning }: ValidationPanelProps) {
  if (isRunning && results.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/15 bg-primary/5 text-xs text-primary">
        <div className="w-3 h-3 rounded-full border border-primary/40 border-t-primary animate-spin flex-shrink-0" />
        <span>Running validation…</span>
      </div>
    );
  }

  if (results.length === 0) return null;

  const allPassed = summary?.allPassed ?? results.every((r) => r.passed);
  const totalErrors = summary?.totalErrors ?? results.reduce((s, r) => s + r.errorCount, 0);

  return (
    <div className="space-y-1.5">
      {/* Summary header */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
          allPassed
            ? "border-green-500/15 bg-green-500/5 text-green-400"
            : "border-red-500/15 bg-red-500/5 text-red-400"
        }`}
      >
        {allPassed ? (
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        <span className="font-medium">
          {allPassed
            ? `Validation passed — ${results.length} tool${results.length !== 1 ? "s" : ""} ran successfully`
            : `Validation failed — ${totalErrors} error${totalErrors !== 1 ? "s" : ""} found`}
        </span>
      </div>

      {/* Individual results */}
      <div className="space-y-1">
        {results.map((result, i) => (
          <ValidationResultCard key={i} result={result} />
        ))}
      </div>
    </div>
  );
}
