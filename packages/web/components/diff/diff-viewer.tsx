"use client";

import { useState } from "react";
import type { FileDiffSummary } from "@martin-coder/shared";

interface DiffViewerProps {
  diff: FileDiffSummary;
  onClose?: () => void;
}

interface ParsedDiffLine {
  type: "header" | "hunk" | "added" | "removed" | "context";
  content: string;
  lineNumber?: number;
}

function parseDiffText(diffText: string): ParsedDiffLine[] {
  const lines = diffText.split("\n");
  const result: ParsedDiffLine[] = [];
  let lineNumAfter = 0;

  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++")) {
      result.push({ type: "header", content: line });
    } else if (line.startsWith("@@")) {
      // Parse hunk header: @@ -a,b +c,d @@
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) lineNumAfter = parseInt(match[1]) - 1;
      result.push({ type: "hunk", content: line });
    } else if (line.startsWith("+")) {
      lineNumAfter++;
      result.push({ type: "added", content: line.slice(1), lineNumber: lineNumAfter });
    } else if (line.startsWith("-")) {
      result.push({ type: "removed", content: line.slice(1) });
    } else if (line.startsWith(" ") || line === "") {
      lineNumAfter++;
      result.push({ type: "context", content: line.slice(1), lineNumber: lineNumAfter });
    }
  }

  return result;
}

function ChangeTypeBadge({ type }: { type: "created" | "modified" | "deleted" }) {
  const config = {
    created: { label: "Created", cls: "bg-green-500/10 text-green-500 border-green-500/20" },
    modified: { label: "Modified", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    deleted: { label: "Deleted", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  }[type];

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.cls}`}>
      {config.label}
    </span>
  );
}

export function DiffViewer({ diff, onClose }: DiffViewerProps) {
  const [showRaw, setShowRaw] = useState(false);

  const parsedLines = parseDiffText(diff.diffText);
  const contentLines = parsedLines.filter(
    (l) => l.type !== "header" && l.type !== "hunk"
  );

  // Get just the filename
  const fileName = diff.filePath.split("/").pop() ?? diff.filePath;
  const dirPath = diff.filePath.slice(0, diff.filePath.length - fileName.length);

  return (
    <div className="flex flex-col h-full min-h-0 bg-card rounded-lg border border-border/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ChangeTypeBadge type={diff.changeType} />
          <div className="flex items-center min-w-0 gap-1">
            {dirPath && (
              <span className="text-[11px] text-muted-foreground/50 truncate hidden sm:block">
                {dirPath}
              </span>
            )}
            <span className="text-[11px] font-mono font-medium text-foreground truncate">
              {fileName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground/50 tabular-nums">
            {diff.linesAdded > 0 && (
              <span className="text-green-500 mr-1">+{diff.linesAdded}</span>
            )}
            {diff.linesRemoved > 0 && (
              <span className="text-red-400">-{diff.linesRemoved}</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className="text-[10px] px-2 py-0.5 rounded border border-border/40 text-muted-foreground/60 hover:text-foreground hover:border-border transition-colors"
          >
            {showRaw ? "Rendered" : "Raw"}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto min-h-0">
        {showRaw ? (
          <pre className="text-[11px] font-mono p-3 whitespace-pre-wrap break-all leading-relaxed text-foreground/80">
            {diff.diffText}
          </pre>
        ) : diff.linesAdded === 0 && diff.linesRemoved === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground/50 text-sm">
            No changes
          </div>
        ) : (
          <table className="w-full text-[11px] font-mono border-collapse">
            <tbody>
              {parsedLines.map((line, i) => {
                if (line.type === "header") {
                  return (
                    <tr key={i} className="bg-secondary/20">
                      <td colSpan={3} className="px-3 py-0.5 text-muted-foreground/50 font-sans text-[10px]">
                        {line.content}
                      </td>
                    </tr>
                  );
                }

                if (line.type === "hunk") {
                  return (
                    <tr key={i} className="bg-blue-500/5 border-y border-blue-500/10">
                      <td colSpan={3} className="px-3 py-0.5 text-blue-400/70 text-[10px]">
                        {line.content}
                      </td>
                    </tr>
                  );
                }

                const isAdded = line.type === "added";
                const isRemoved = line.type === "removed";

                return (
                  <tr
                    key={i}
                    className={`
                      ${isAdded ? "bg-green-500/8 hover:bg-green-500/12" : ""}
                      ${isRemoved ? "bg-red-500/8 hover:bg-red-500/12" : ""}
                      ${!isAdded && !isRemoved ? "hover:bg-secondary/20" : ""}
                    `}
                  >
                    <td className="w-6 px-2 py-0 text-center select-none text-muted-foreground/30 border-r border-border/20">
                      {isAdded ? (
                        <span className="text-green-500/70">+</span>
                      ) : isRemoved ? (
                        <span className="text-red-400/70">-</span>
                      ) : (
                        <span> </span>
                      )}
                    </td>
                    <td className="w-10 px-2 py-0 text-right select-none text-muted-foreground/30 border-r border-border/20 tabular-nums">
                      {line.lineNumber}
                    </td>
                    <td
                      className={`px-3 py-0 leading-5 whitespace-pre ${
                        isAdded ? "text-green-400" : isRemoved ? "text-red-400" : "text-foreground/80"
                      }`}
                    >
                      {line.content}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── File changes summary list ──────────────────────────────────────────────────

interface FileChangesListProps {
  changes: FileDiffSummary[];
  onSelect: (change: FileDiffSummary) => void;
  selectedPath?: string;
}

export function FileChangesList({ changes, onSelect, selectedPath }: FileChangesListProps) {
  if (changes.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-muted-foreground/40 text-xs">
        No file changes yet
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {changes.map((change) => {
        const fileName = change.filePath.split("/").pop() ?? change.filePath;
        const isSelected = selectedPath === change.filePath;

        return (
          <button
            key={change.snapshotId}
            type="button"
            onClick={() => onSelect(change)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors ${
              isSelected
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}
          >
            <span
              className={`flex-shrink-0 font-mono text-[10px] ${
                change.changeType === "created"
                  ? "text-green-500"
                  : change.changeType === "deleted"
                  ? "text-red-400"
                  : "text-blue-400"
              }`}
            >
              {change.changeType === "created" ? "A" : change.changeType === "deleted" ? "D" : "M"}
            </span>
            <span className="flex-1 font-mono truncate">{fileName}</span>
            <span className="flex-shrink-0 tabular-nums text-muted-foreground/40">
              {change.linesAdded > 0 && (
                <span className="text-green-500/70 mr-0.5">+{change.linesAdded}</span>
              )}
              {change.linesRemoved > 0 && (
                <span className="text-red-400/70">-{change.linesRemoved}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
