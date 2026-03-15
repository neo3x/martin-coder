"use client";

import { useState } from "react";
import { useExecutionStore } from "@/lib/stores/execution-store";
import { DiffViewer, FileChangesList } from "@/components/diff/diff-viewer";
import { ValidationPanel } from "@/components/validation/validation-panel";
import type { FileDiffSummary } from "@martin-coder/shared";

interface LiveDiffPanelProps {
  onClose: () => void;
}

export function LiveDiffPanel({ onClose }: LiveDiffPanelProps) {
  const { liveExecution } = useExecutionStore();
  const [selectedDiff, setSelectedDiff] = useState<FileDiffSummary | null>(null);
  const [activeTab, setActiveTab] = useState<"changes" | "validation">("changes");

  const fileChanges = liveExecution?.fileChanges ?? [];
  const validationResults = liveExecution?.validationResults ?? [];
  const validationSummary = liveExecution?.validationSummary;
  const hasValidation = validationResults.length > 0;

  // Auto-select first diff
  const displayDiff = selectedDiff ?? fileChanges[0] ?? null;

  if (!liveExecution && fileChanges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-card border-l border-border/40 w-80">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-sm font-medium">Changes</span>
          {fileChanges.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {fileChanges.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      {hasValidation && (
        <div className="flex border-b border-border/30 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("changes")}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === "changes"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground/60 hover:text-foreground"
            }`}
          >
            Files
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("validation")}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === "validation"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground/60 hover:text-foreground"
            }`}
          >
            Validation
            {!validationSummary?.allPassed && validationResults.length > 0 && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
            )}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === "changes" ? (
          <div className="flex flex-col h-full min-h-0">
            {fileChanges.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-muted-foreground/40 text-xs">
                {liveExecution ? "Waiting for file changes…" : "No changes"}
              </div>
            ) : (
              <>
                {/* File list */}
                <div className="p-2 border-b border-border/30 flex-shrink-0">
                  <FileChangesList
                    changes={fileChanges}
                    onSelect={setSelectedDiff}
                    selectedPath={displayDiff?.filePath}
                  />
                </div>

                {/* Diff viewer */}
                {displayDiff && (
                  <div className="flex-1 min-h-0 overflow-hidden p-2">
                    <DiffViewer diff={displayDiff} />
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="p-3">
            <ValidationPanel
              results={validationResults}
              summary={validationSummary}
              isRunning={liveExecution?.phase === "validating"}
            />
          </div>
        )}
      </div>
    </div>
  );
}
