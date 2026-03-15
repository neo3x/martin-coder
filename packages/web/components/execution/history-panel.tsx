"use client";

import { useState, useEffect } from "react";
import { useExecutionStore, type HistoricalExecution, type ExecutionDetail } from "@/lib/stores/execution-store";
import { DiffViewer } from "@/components/diff/diff-viewer";
import type { FileDiffSummary } from "@martin-coder/shared";

const PHASE_LABELS: Record<string, string> = {
  understanding: "Understanding",
  scanning: "Scanning",
  reading: "Reading",
  building: "Building",
  waiting_approval: "Awaiting Approval",
  generating: "Generating",
  applying: "Applying",
  validating: "Validating",
  completed: "Completed",
  failed: "Failed",
  rolled_back: "Rolled Back",
};

function timeAgo(isoDate: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(isoDate).toLocaleDateString();
}

function ExecutionStatusBadge({ phase }: { phase: string }) {
  const cfg = {
    completed: "bg-green-500/10 text-green-500 border-green-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    rolled_back: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  }[phase] || "bg-primary/10 text-primary border-primary/20";

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${cfg}`}>
      {PHASE_LABELS[phase] || phase}
    </span>
  );
}

interface HistoryItemProps {
  execution: HistoricalExecution;
  isSelected: boolean;
  onClick: () => void;
}

function HistoryItem({ execution, isSelected, onClick }: HistoryItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
        isSelected
          ? "bg-primary/8 border-primary/20"
          : "bg-card/50 border-border/30 hover:border-border/60 hover:bg-secondary/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground truncate font-medium leading-snug">
            {execution.prompt.slice(0, 80)}{execution.prompt.length > 80 ? "…" : ""}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <ExecutionStatusBadge phase={execution.phase} />
            {execution.filesChanged > 0 && (
              <span className="text-[10px] text-muted-foreground/50">
                {execution.filesChanged} file{execution.filesChanged !== 1 ? "s" : ""}
              </span>
            )}
            {execution.validationPassed !== undefined && (
              <span className={`text-[10px] ${execution.validationPassed ? "text-green-500/70" : "text-red-400/70"}`}>
                {execution.validationPassed ? "✓ validated" : "✗ validation failed"}
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground/40 flex-shrink-0 mt-0.5">
          {timeAgo(execution.createdAt)}
        </span>
      </div>
    </button>
  );
}

interface ExecutionDetailViewProps {
  execution: ExecutionDetail;
  onRollback: (id: string) => void;
  isRollingBack: boolean;
}

function ExecutionDetailView({ execution, onRollback, isRollingBack }: ExecutionDetailViewProps) {
  const [selectedDiff, setSelectedDiff] = useState<FileDiffSummary | null>(null);

  const canRollback = execution.phase !== "rolled_back" && execution.snapshots.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Execution meta */}
      <div className="flex items-start justify-between gap-2 px-1">
        <div>
          <p className="text-xs font-medium text-foreground leading-snug">
            {execution.prompt.slice(0, 100)}{execution.prompt.length > 100 ? "…" : ""}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <ExecutionStatusBadge phase={execution.phase} />
            <span className="text-[10px] text-muted-foreground/40">{timeAgo(execution.createdAt)}</span>
          </div>
        </div>

        {canRollback && (
          <button
            type="button"
            onClick={() => onRollback(execution.id)}
            disabled={isRollingBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-amber-500/30 bg-amber-500/8 text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            {isRollingBack ? "Rolling back…" : "Roll Back"}
          </button>
        )}
      </div>

      {/* File changes */}
      {execution.snapshots.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground/60 px-1 uppercase tracking-wider">
            Files Changed ({execution.snapshots.length})
          </p>
          <div className="space-y-0.5">
            {execution.snapshots.map((snap) => {
              const fileName = snap.filePath.split("/").pop() ?? snap.filePath;
              const isSelected = selectedDiff?.snapshotId === snap.id;
              const changeType = snap.changeType as "created" | "modified" | "deleted";

              return (
                <button
                  key={snap.id}
                  type="button"
                  onClick={() => {
                    if (snap.diffText) {
                      setSelectedDiff(isSelected ? null : {
                        snapshotId: snap.id,
                        filePath: snap.filePath,
                        changeType,
                        linesAdded: snap.linesAdded,
                        linesRemoved: snap.linesRemoved,
                        diffText: snap.diffText,
                      });
                    }
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors ${
                    isSelected
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  } ${snap.isRestored ? "opacity-60" : ""}`}
                >
                  <span className={`flex-shrink-0 font-mono text-[10px] font-bold ${
                    changeType === "created" ? "text-green-500" :
                    changeType === "deleted" ? "text-red-400" : "text-blue-400"
                  }`}>
                    {changeType === "created" ? "A" : changeType === "deleted" ? "D" : "M"}
                  </span>
                  <span className="flex-1 font-mono truncate">{fileName}</span>
                  {snap.isRestored && (
                    <span className="text-[10px] text-amber-400/60 flex-shrink-0">restored</span>
                  )}
                  <span className="flex-shrink-0 tabular-nums text-muted-foreground/40 text-[10px]">
                    {snap.linesAdded > 0 && <span className="text-green-500/70 mr-0.5">+{snap.linesAdded}</span>}
                    {snap.linesRemoved > 0 && <span className="text-red-400/70">-{snap.linesRemoved}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Diff viewer */}
          {selectedDiff && (
            <div className="mt-2 h-64">
              <DiffViewer diff={selectedDiff} onClose={() => setSelectedDiff(null)} />
            </div>
          )}
        </div>
      )}

      {/* Validation results */}
      {execution.validationResults.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground/60 px-1 uppercase tracking-wider">
            Validation
          </p>
          <div className="space-y-0.5">
            {execution.validationResults.map((vr) => (
              <div
                key={vr.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                  vr.passed
                    ? "bg-green-500/5 text-green-400"
                    : "bg-red-500/5 text-red-400"
                }`}
              >
                {vr.passed ? (
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className="font-medium">{vr.toolType}</span>
                {vr.errorCount > 0 && (
                  <span className="text-[10px]">{vr.errorCount} errors</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {execution.errorMessage && (
        <div className="px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/15 text-[11px] text-red-400">
          <p className="font-medium mb-0.5">Error</p>
          <p className="text-red-400/70">{execution.errorMessage}</p>
        </div>
      )}
    </div>
  );
}

interface HistoryPanelProps {
  sessionId: string | null;
  onClose: () => void;
}

export function HistoryPanel({ sessionId, onClose }: HistoryPanelProps) {
  const {
    executionHistory,
    isLoadingHistory,
    selectedExecution,
    isLoadingDetail,
    fetchExecutionHistory,
    fetchExecutionDetail,
    rollbackExecution,
    clearSelectedExecution,
  } = useExecutionStore();

  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackResult, setRollbackResult] = useState<{ filesRestored: number; errors: string[] } | null>(null);

  useEffect(() => {
    if (sessionId) {
      void fetchExecutionHistory(sessionId);
    }
  }, [sessionId, fetchExecutionHistory]);

  const handleSelectExecution = (id: string) => {
    void fetchExecutionDetail(id);
  };

  const handleRollback = async (executionId: string) => {
    if (!confirm("Roll back all file changes from this execution? This cannot be undone.")) return;
    setIsRollingBack(true);
    setRollbackResult(null);
    try {
      const result = await rollbackExecution(executionId);
      setRollbackResult(result);
    } catch (err) {
      console.error("Rollback failed:", err);
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-card border-l border-border/40 w-80">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">Execution History</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {selectedExecution ? (
          <div className="p-3 h-full overflow-y-auto">
            {/* Back button */}
            <button
              type="button"
              onClick={clearSelectedExecution}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground mb-3 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All executions
            </button>

            {isLoadingDetail ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground/40 text-sm">
                Loading…
              </div>
            ) : (
              <>
                {rollbackResult && (
                  <div className="mb-3 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400">
                    Rolled back {rollbackResult.filesRestored} file{rollbackResult.filesRestored !== 1 ? "s" : ""}
                    {rollbackResult.errors.length > 0 && (
                      <div className="mt-1 text-red-400/70">
                        {rollbackResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                      </div>
                    )}
                  </div>
                )}
                <ExecutionDetailView
                  execution={selectedExecution}
                  onRollback={handleRollback}
                  isRollingBack={isRollingBack}
                />
              </>
            )}
          </div>
        ) : (
          <div className="p-3 space-y-1.5">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-16 text-muted-foreground/40 text-sm">
                Loading…
              </div>
            ) : executionHistory.length === 0 ? (
              <div className="flex items-center justify-center h-16 text-muted-foreground/40 text-xs text-center px-4">
                No executions yet in this session
              </div>
            ) : (
              executionHistory.map((exec) => (
                <HistoryItem
                  key={exec.id}
                  execution={exec}
                  isSelected={selectedExecution?.id === exec.id}
                  onClick={() => handleSelectExecution(exec.id)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
