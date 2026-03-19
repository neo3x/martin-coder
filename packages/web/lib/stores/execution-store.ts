"use client";

import { create } from "zustand";
import { api } from "@/lib/api";
import type { ExecutionPhase, FileDiffSummary, ValidationReport } from "@martin-coder/shared";

export interface LiveExecution {
  executionId: string;
  phase: ExecutionPhase;
  statusMessage: string;
  fileChanges: FileDiffSummary[];
  validationResults: Array<{
    toolType: string;
    toolCommand: string;
    passed: boolean;
    errorCount: number;
    warningCount: number;
    stdout: string;
    stderr: string;
    durationMs: number;
  }>;
  validationSummary?: ValidationReport;
  startedAt: string;
}

export interface HistoricalExecution {
  id: string;
  sessionId: string;
  prompt: string;
  phase: ExecutionPhase;
  agentName: string;
  filesChanged: number;
  validationPassed?: boolean;
  validationSummary?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

export interface ExecutionDetail extends HistoricalExecution {
  snapshots: Array<{
    id: string;
    filePath: string;
    changeType: "created" | "modified" | "deleted";
    contentBefore?: string;
    contentAfter?: string;
    diffText?: string;
    linesAdded: number;
    linesRemoved: number;
    isRestored: boolean;
    createdAt: string;
  }>;
  validationResults: Array<{
    id: string;
    toolType: string;
    toolCommand: string;
    passed: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    errorCount: number;
    warningCount: number;
    durationMs: number;
    createdAt: string;
  }>;
}

interface ExecutionStore {
  // Live execution state (current streaming execution)
  liveExecution: LiveExecution | null;

  // History of past executions for current session
  executionHistory: HistoricalExecution[];
  isLoadingHistory: boolean;

  // Detail view
  selectedExecution: ExecutionDetail | null;
  isLoadingDetail: boolean;

  // Panel visibility
  showHistory: boolean;
  showDiffPanel: boolean;
  selectedDiff: FileDiffSummary | null;

  // Actions for live execution tracking
  startLiveExecution: (executionId: string) => void;
  updatePhase: (phase: ExecutionPhase, statusMessage: string) => void;
  addFileChange: (change: FileDiffSummary) => void;
  addValidationResult: (result: LiveExecution["validationResults"][0]) => void;
  setValidationSummary: (summary: ValidationReport) => void;
  clearLiveExecution: () => void;

  // History actions
  fetchExecutionHistory: (sessionId: string) => Promise<void>;
  fetchExecutionDetail: (executionId: string) => Promise<void>;
  rollbackExecution: (executionId: string) => Promise<{ filesRestored: number; errors: string[] }>;

  // UI actions
  setShowHistory: (show: boolean) => void;
  setShowDiffPanel: (show: boolean) => void;
  setSelectedDiff: (diff: FileDiffSummary | null) => void;
  clearSelectedExecution: () => void;
}

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  liveExecution: null,
  executionHistory: [],
  isLoadingHistory: false,
  selectedExecution: null,
  isLoadingDetail: false,
  showHistory: false,
  showDiffPanel: false,
  selectedDiff: null,

  startLiveExecution: (executionId) => {
    set({
      liveExecution: {
        executionId,
        phase: "understanding",
        statusMessage: "Starting…",
        fileChanges: [],
        validationResults: [],
        validationSummary: undefined,
        startedAt: new Date().toISOString(),
      },
    });
  },

  updatePhase: (phase, statusMessage) => {
    set((state) => ({
      liveExecution: state.liveExecution
        ? { ...state.liveExecution, phase, statusMessage }
        : null,
    }));
  },

  addFileChange: (change) => {
    set((state) => ({
      liveExecution: state.liveExecution
        ? {
            ...state.liveExecution,
            fileChanges: [...state.liveExecution.fileChanges, change],
          }
        : null,
      // Auto-open diff panel when first file change arrives
      showDiffPanel: state.liveExecution?.fileChanges.length === 0 ? true : state.showDiffPanel,
    }));
  },

  addValidationResult: (result) => {
    set((state) => ({
      liveExecution: state.liveExecution
        ? {
            ...state.liveExecution,
            validationResults: [...state.liveExecution.validationResults, result],
          }
        : null,
    }));
  },

  setValidationSummary: (summary) => {
    set((state) => ({
      liveExecution: state.liveExecution
        ? { ...state.liveExecution, validationSummary: summary }
        : null,
    }));
  },

  clearLiveExecution: () => {
    set({ liveExecution: null });
  },

  fetchExecutionHistory: async (sessionId) => {
    set({ isLoadingHistory: true });
    try {
      const data = await api.get<{ executions: HistoricalExecution[] }>(
        `/executions?sessionId=${sessionId}`
      );
      set({ executionHistory: data.executions || [], isLoadingHistory: false });
    } catch {
      set({ isLoadingHistory: false });
    }
  },

  fetchExecutionDetail: async (executionId) => {
    set({ isLoadingDetail: true });
    try {
      const data = await api.get<{ execution: ExecutionDetail }>(
        `/executions/${executionId}`
      );
      set({ selectedExecution: data.execution, isLoadingDetail: false });
    } catch {
      set({ isLoadingDetail: false });
    }
  },

  rollbackExecution: async (executionId) => {
    const data = await api.post<{ filesRestored: number; errors: string[] }>(
      `/executions/${executionId}/rollback`
    );
    // Refresh execution detail
    await get().fetchExecutionDetail(executionId);
    return data;
  },

  setShowHistory: (show) => set({ showHistory: show }),
  setShowDiffPanel: (show) => set({ showDiffPanel: show }),
  setSelectedDiff: (diff) => set({ selectedDiff: diff }),
  clearSelectedExecution: () => set({ selectedExecution: null }),
}));
