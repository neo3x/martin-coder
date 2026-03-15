"use client";

import type { ExecutionPhase } from "@martin-coder/shared";

interface ExecutionTimelineProps {
  phase: ExecutionPhase;
  statusMessage: string;
  filesChanged: number;
  className?: string;
}

const PHASE_ORDER: ExecutionPhase[] = [
  "understanding",
  "scanning",
  "reading",
  "generating",
  "applying",
  "validating",
  "completed",
];

const PHASE_LABELS: Record<ExecutionPhase, string> = {
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

const PHASE_ICONS: Record<ExecutionPhase, React.ReactNode> = {
  understanding: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  scanning: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  reading: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  building: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  waiting_approval: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  generating: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  applying: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  validating: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  completed: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  failed: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  rolled_back: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  ),
};

function PhaseIndicator({ phase }: { phase: ExecutionPhase }) {
  const isFailed = phase === "failed";
  const isRolledBack = phase === "rolled_back";
  const isCompleted = phase === "completed";

  const currentIdx = PHASE_ORDER.indexOf(phase);

  return (
    <div className="flex items-center gap-1">
      {PHASE_ORDER.slice(0, -1).map((p, i) => {
        const isActive = p === phase;
        const isDone = i < currentIdx && !isFailed && !isRolledBack;

        return (
          <div key={p} className="flex items-center gap-1">
            <div
              className={`
                w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                ${isActive ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : ""}
                ${isDone ? "bg-primary/20 text-primary" : ""}
                ${!isActive && !isDone ? "bg-secondary/50 text-muted-foreground/30" : ""}
              `}
              title={PHASE_LABELS[p]}
            >
              {isActive && (
                <div className="w-2.5 h-2.5 rounded-full border border-primary-foreground/60 border-t-transparent animate-spin" />
              )}
              {isDone && PHASE_ICONS[p]}
              {!isActive && !isDone && (
                <div className="w-1 h-1 rounded-full bg-current" />
              )}
            </div>
            {i < PHASE_ORDER.length - 2 && (
              <div className={`w-3 h-px ${isDone ? "bg-primary/30" : "bg-border/40"}`} />
            )}
          </div>
        );
      })}

      {/* Final state */}
      <div className="flex items-center gap-1">
        <div className="w-3 h-px bg-border/40" />
        <div
          className={`
            w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
            ${isCompleted ? "bg-green-500/20 text-green-500" : ""}
            ${isFailed ? "bg-red-500/20 text-red-500" : ""}
            ${isRolledBack ? "bg-amber-500/20 text-amber-500" : ""}
            ${!isCompleted && !isFailed && !isRolledBack ? "bg-secondary/50 text-muted-foreground/30" : ""}
          `}
          title={isCompleted ? "Completed" : isFailed ? "Failed" : isRolledBack ? "Rolled Back" : ""}
        >
          {isCompleted && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
          {isFailed && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
          {isRolledBack && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>}
          {!isCompleted && !isFailed && !isRolledBack && <div className="w-1 h-1 rounded-full bg-current" />}
        </div>
      </div>
    </div>
  );
}

export function ExecutionTimeline({
  phase,
  statusMessage,
  filesChanged,
  className = "",
}: ExecutionTimelineProps) {
  const isFailed = phase === "failed";
  const isCompleted = phase === "completed";
  const isRolledBack = phase === "rolled_back";

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs ${
        isFailed
          ? "bg-red-500/5 border-red-500/20 text-red-400"
          : isCompleted
          ? "bg-green-500/5 border-green-500/20 text-green-400"
          : isRolledBack
          ? "bg-amber-500/5 border-amber-500/20 text-amber-400"
          : "bg-primary/5 border-primary/15 text-primary"
      } ${className}`}
    >
      <PhaseIndicator phase={phase} />

      <div className="flex-1 min-w-0">
        <span className="font-medium">{PHASE_LABELS[phase]}</span>
        {statusMessage && (
          <span className="text-muted-foreground/60 ml-2">{statusMessage}</span>
        )}
      </div>

      {filesChanged > 0 && (
        <span className="flex-shrink-0 text-muted-foreground/50 tabular-nums">
          {filesChanged} file{filesChanged !== 1 ? "s" : ""} changed
        </span>
      )}
    </div>
  );
}
