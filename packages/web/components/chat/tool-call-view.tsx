"use client";

import { useState } from "react";

export interface ToolCallItem {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status: "calling" | "done" | "error";
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconFile() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function IconTerminal() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconX() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconChevron({ down }: { down: boolean }) {
  return (
    <svg className={`w-3 h-3 text-muted-foreground transition-transform duration-150 ${down ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getToolIcon(name: string) {
  switch (name) {
    case "read_file":       return <IconFile />;
    case "write_file":      return <IconEdit />;
    case "edit_file":       return <IconEdit />;
    case "bash":            return <IconTerminal />;
    case "list_files":      return <IconFolder />;
    case "search_files":    return <IconSearch />;
    default:                return <IconGear />;
  }
}

function getToolLabel(name: string, args: Record<string, unknown>): string {
  const filePath = (args.file_path ?? args.path ?? args.directory ?? "") as string;
  const shortPath = filePath
    ? filePath.split("/").slice(-2).join("/")
    : "";

  switch (name) {
    case "read_file":    return `Reading  ${shortPath || "file"}`;
    case "write_file":   return `Writing  ${shortPath || "file"}`;
    case "edit_file":    return `Editing  ${shortPath || "file"}`;
    case "bash":         return `$ ${String(args.command ?? "").slice(0, 60)}`;
    case "list_files":   return `Listing  ${shortPath || "directory"}`;
    case "search_files": return `Search   "${String(args.pattern ?? "").slice(0, 30)}"`;
    default:             return name.replace(/_/g, " ");
  }
}

function formatResult(result: unknown): string {
  if (result === null || result === undefined) return "";
  if (typeof result === "string") {
    return result.length > 400 ? result.slice(0, 400) + "\n…" : result;
  }
  try {
    const str = JSON.stringify(result, null, 2);
    return str.length > 400 ? str.slice(0, 400) + "\n…" : str;
  } catch {
    return String(result);
  }
}

// ── ToolCallView ─────────────────────────────────────────────────────────────

function ToolCallView({ name, arguments: args, result, error, status }: ToolCallItem) {
  const [expanded, setExpanded] = useState(false);

  const resultText = error ? `Error: ${error}` : formatResult(result);
  const hasResult  = resultText.trim().length > 0;

  const statusIcon =
    status === "calling" ? <IconSpinner /> :
    status === "done"    ? <IconCheck /> :
                           <IconX />;

  const statusColor =
    status === "done"    ? "text-emerald-500" :
    status === "error"   ? "text-red-500" :
                           "text-amber-400";

  return (
    <div className="tool-call-item">
      <button
        type="button"
        onClick={() => hasResult && setExpanded((v) => !v)}
        className="tool-call-header"
        disabled={!hasResult}
      >
        <span className={`tool-call-icon ${statusColor}`}>{getToolIcon(name)}</span>
        <span className="tool-call-label">{getToolLabel(name, args)}</span>
        <span className={`tool-call-status mr-1 ${statusColor}`}>{statusIcon}</span>
        {hasResult && <IconChevron down={expanded} />}
      </button>

      {expanded && hasResult && (
        <div className="tool-call-result">
          <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {resultText}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── ToolCallGroup (exported) ──────────────────────────────────────────────────

export function ToolCallGroup({ toolCalls }: { toolCalls: ToolCallItem[] }) {
  if (!toolCalls || toolCalls.length === 0) return null;
  return (
    <div className="tool-call-group">
      {toolCalls.map((tc) => (
        <ToolCallView key={tc.id} {...tc} />
      ))}
    </div>
  );
}
