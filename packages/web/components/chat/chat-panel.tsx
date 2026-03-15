"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useChatStore } from "@/lib/stores/chat-store";
import { useProjectStore } from "@/lib/stores/project-store";
import { useExecutionStore } from "@/lib/stores/execution-store";
import { ToolCallGroup, type ToolCallItem } from "@/components/chat/tool-call-view";
import { SmartPrompts } from "@/components/chat/smart-prompts";
import {
  InterpretationPanel,
  InterpretingPlaceholder,
  type InterpretationResult,
} from "@/components/chat/interpretation-panel";
import { ExecutionTimeline } from "@/components/execution/execution-timeline";
import { LiveDiffPanel } from "@/components/diff/live-diff-panel";
import { HistoryPanel } from "@/components/execution/history-panel";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.0001) return "<$0.0001";
  return `$${usd.toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function timeLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// ── Interpretation logic (client-side) ────────────────────────────────────────

function buildInterpretation(
  prompt: string,
  agent: "build" | "plan",
  fileTree: import("@/lib/stores/project-store").ProjectFileNode[],
  selectedProject: import("@/lib/stores/project-store").ProjectItem | null
): InterpretationResult {
  const lower = prompt.toLowerCase();

  // Detect likely intent
  const isGenerate = /\b(create|generate|add|build|write|implement|make)\b/i.test(prompt);
  const isDebug = /\b(fix|debug|bug|error|issue|broken|fail|crash)\b/i.test(prompt);
  const isRefactor = /\b(refactor|improve|clean|optimize|rename|reorganize)\b/i.test(prompt);
  const isReview = /\b(review|analyze|audit|explain|understand|check)\b/i.test(prompt);
  const isDelete = /\b(delete|remove|drop|destroy)\b/i.test(prompt);
  const isTest = /\b(test|spec|unit test|jest|vitest)\b/i.test(prompt);

  // Build summary
  let actionVerb = "Perform changes";
  if (isGenerate) actionVerb = "Generate";
  if (isDebug) actionVerb = "Debug and fix";
  if (isRefactor) actionVerb = "Refactor";
  if (isReview) actionVerb = "Analyze and review";
  if (isDelete) actionVerb = "Remove";
  if (isTest) actionVerb = "Write tests for";

  const summary = `${actionVerb} as described: "${prompt.length > 120 ? prompt.slice(0, 117) + "…" : prompt}"`;

  // Scope
  const hasProjectContext = !!selectedProject;
  const scope = hasProjectContext
    ? `Operating on project "${selectedProject!.name}" ${agent === "plan" ? "in read-only plan mode (no writes)" : "in build mode (full read/write access)"}`
    : `No project selected — working in chat-only context. ${agent === "plan" ? "Plan mode (read-only)." : "Build mode."}`;

  // File guesses based on keywords + existing tree
  const guessedFiles: string[] = [];
  if (fileTree.length > 0) {
    const flatten = (nodes: import("@/lib/stores/project-store").ProjectFileNode[]): string[] =>
      nodes.flatMap((n) => n.type === "file" ? [n.path] : flatten(n.children ?? []));
    const allFiles = flatten(fileTree);

    const keywords = prompt.match(/\b[\w-]+\.(tsx?|jsx?|css|json|md|py|go|rs|sql|yaml|yml|sh)\b/gi) ?? [];
    for (const kw of keywords) {
      const match = allFiles.find((f) => f.includes(kw));
      if (match && !guessedFiles.includes(match)) guessedFiles.push(match);
    }

    // Generic guesses based on category
    if (guessedFiles.length === 0) {
      if (lower.includes("component") || lower.includes("ui") || lower.includes("page")) {
        const ui = allFiles.filter((f) => f.includes("component") || f.includes("page")).slice(0, 3);
        guessedFiles.push(...ui);
      }
      if (lower.includes("api") || lower.includes("route") || lower.includes("endpoint")) {
        const api = allFiles.filter((f) => f.includes("route") || f.includes("api") || f.includes("index")).slice(0, 3);
        guessedFiles.push(...api);
      }
      if (lower.includes("store") || lower.includes("state")) {
        const stores = allFiles.filter((f) => f.includes("store")).slice(0, 3);
        guessedFiles.push(...stores);
      }
    }
  }

  // Risks
  const risks: string[] = [];
  if (agent === "build" && isDelete) risks.push("Deletion is irreversible. Confirm the targeted files carefully.");
  if (agent === "build" && isRefactor) risks.push("Refactoring may affect imports across multiple files.");
  if (agent === "build" && !hasProjectContext) risks.push("No project context — agent will work on chat content only.");
  if (lower.includes("production") || lower.includes("deploy")) risks.push("Changes may have production implications — review output carefully.");
  if (lower.includes("database") || lower.includes("migration")) risks.push("Database schema changes should be tested in a staging environment first.");

  // Assumptions
  const assumptions: string[] = [];
  if (hasProjectContext) {
    assumptions.push(`Project root is "${selectedProject!.localPath ?? selectedProject!.name}"`);
  }
  if (agent === "build") {
    assumptions.push("TypeScript/JavaScript is the primary language unless specified otherwise");
  }
  if (isGenerate) {
    assumptions.push("Generated code will follow the existing project conventions");
  }

  return {
    summary,
    scope,
    files: guessedFiles.slice(0, 6),
    risks,
    assumptions,
    mode: agent,
  };
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="absolute top-2 right-2 px-2 py-1 text-[10px] rounded bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="chat-message">
      <ReactMarkdown
        components={{
          pre: ({ children, ...props }) => {
            const codeEl = (children as React.ReactElement[])?.[0];
            const text =
              typeof codeEl?.props?.children === "string"
                ? codeEl.props.children
                : "";
            return (
              <div className="relative group my-3">
                <pre
                  {...props}
                  className="rounded-lg p-3 overflow-x-auto bg-black/40 border border-border/50 text-xs font-mono"
                >
                  {children}
                </pre>
                {text && <CopyButton text={text} />}
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ── Message item ──────────────────────────────────────────────────────────────

interface MessageItemProps {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: ToolCallItem[];
  createdAt?: string;
  tokens?: number;
  cost?: number;
}

function MessageItem({ role, content, toolCalls, createdAt, tokens, cost }: MessageItemProps) {
  const isUser = role === "user";
  if (role === "system" || role === "tool") return null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2.5 animate-slide-up`}>
      {/* AI avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex-shrink-0 flex items-center justify-center mt-0.5">
          <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
      )}

      {/* Content */}
      <div className={`flex flex-col gap-1 max-w-[82%] min-w-0 ${isUser ? "items-end" : "items-start"}`}>
        {!isUser && toolCalls && toolCalls.length > 0 && (
          <div className="w-full"><ToolCallGroup toolCalls={toolCalls} /></div>
        )}
        {content && (
          <div className={isUser ? "message-user" : "message-assistant"}>
            {isUser ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
            ) : (
              <MarkdownContent content={content} />
            )}
          </div>
        )}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/45">
          {createdAt && <span>{timeLabel(createdAt)}</span>}
          {tokens != null && tokens > 0 && <span>{formatTokens(tokens)} tokens</span>}
          {cost != null && cost > 0 && <span>{formatCost(cost)}</span>}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-primary flex-shrink-0 flex items-center justify-center mt-0.5">
          <svg className="w-3.5 h-3.5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ── Agent mode toggle ─────────────────────────────────────────────────────────

function AgentToggle() {
  const { selectedAgent, setAgent } = useChatStore();
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-secondary/50 rounded-lg border border-border/40">
      <button
        type="button"
        onClick={() => setAgent("build")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
          selectedAgent === "build"
            ? "bg-card shadow-sm text-foreground border border-border/40"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Build mode: full read/write and bash access"
      >
        <svg className={`w-3 h-3 ${selectedAgent === "build" ? "text-amber-500" : "text-muted-foreground"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Build
      </button>
      <button
        type="button"
        onClick={() => setAgent("plan")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
          selectedAgent === "plan"
            ? "bg-card shadow-sm text-foreground border border-border/40"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Plan mode: read-only analysis and planning"
      >
        <svg className={`w-3 h-3 ${selectedAgent === "plan" ? "text-blue-400" : "text-muted-foreground"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        Plan
      </button>
    </div>
  );
}

// ── Interpretation phase state ────────────────────────────────────────────────

type InterpretPhase =
  | { type: "idle" }
  | { type: "interpreting" }
  | { type: "waiting_approval"; interpretation: InterpretationResult; originalPrompt: string }
  | { type: "executing" };

// ── ChatPanel ─────────────────────────────────────────────────────────────────

export function ChatPanel() {
  const {
    currentSession,
    messages,
    isStreaming,
    streamingContent,
    streamingToolCalls,
    lastUsage,
    lastCost,
    sendMessage,
    createSession,
    selectedAgent,
  } = useChatStore();

  const { fileTree, selectedProject } = useProjectStore();

  const {
    liveExecution,
    showHistory,
    showDiffPanel,
    setShowHistory,
    setShowDiffPanel,
  } = useExecutionStore();

  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<InterpretPhase>({ type: "idle" });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEmpty = messages.length === 0 && !isStreaming && phase.type === "idle";

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent, streamingToolCalls.length, phase]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  // When streaming finishes, reset phase
  useEffect(() => {
    if (!isStreaming && phase.type === "executing") {
      setPhase({ type: "idle" });
    }
  }, [isStreaming, phase.type]);

  // ── Submit flow ─────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (overrideText?: string) => {
      const msg = (overrideText ?? input).trim();
      if (!msg || isStreaming || phase.type !== "idle") return;

      setInput("");
      setPhase({ type: "interpreting" });

      // Simulate brief interpretation delay (gives the UI a moment to render)
      await new Promise((r) => setTimeout(r, 600));

      const interpretation = buildInterpretation(msg, selectedAgent, fileTree, selectedProject);
      setPhase({ type: "waiting_approval", interpretation, originalPrompt: msg });
    },
    [input, isStreaming, phase.type, selectedAgent, fileTree, selectedProject]
  );

  const handleApprove = useCallback(async () => {
    if (phase.type !== "waiting_approval") return;
    const { originalPrompt } = phase;
    setPhase({ type: "executing" });

    if (!currentSession) {
      await createSession({ title: originalPrompt.slice(0, 60) });
    }
    await sendMessage(originalPrompt);
  }, [phase, currentSession, createSession, sendMessage]);

  const handleRefine = useCallback(
    (refinedPrompt: string) => {
      if (phase.type !== "waiting_approval") return;
      setPhase({ type: "idle" });
      setInput(refinedPrompt);
      textareaRef.current?.focus();
    },
    [phase]
  );

  const handleCancel = useCallback(() => {
    setPhase({ type: "idle" });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  // Map streamingToolCalls → ToolCallItem
  const liveToolCalls: ToolCallItem[] = streamingToolCalls.map((tc) => ({
    id: tc.id,
    name: tc.name,
    arguments: tc.arguments,
    result: tc.result,
    error: tc.error,
    status: tc.status,
  }));

  const isInputDisabled = isStreaming || phase.type === "interpreting" || phase.type === "executing";

  const hasLiveDiffData = (liveExecution?.fileChanges.length ?? 0) > 0 ||
    (liveExecution?.validationResults.length ?? 0) > 0;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Main chat column ──────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

      {/* ── Conversation area ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <SmartPrompts
            onPrompt={(text) => {
              setInput(text);
              textareaRef.current?.focus();
            }}
          />
        ) : (
          <div className="px-4 py-4 space-y-5 max-w-4xl mx-auto w-full">
            {/* Historical messages */}
            {messages.map((msg) => {
              const toolCalls: ToolCallItem[] = (msg.toolCalls ?? []).map((tc) => ({
                id: tc.id,
                name: tc.name,
                arguments: tc.arguments,
                status: "done" as const,
              }));
              return (
                <MessageItem
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  toolCalls={toolCalls.length > 0 ? toolCalls : undefined}
                  createdAt={msg.createdAt ?? msg.created_at}
                  tokens={(msg.promptTokens ?? 0) + (msg.completionTokens ?? 0)}
                  cost={msg.costUsd}
                />
              );
            })}

            {/* Interpretation phases */}
            {phase.type === "interpreting" && (
              <InterpretingPlaceholder />
            )}

            {phase.type === "waiting_approval" && (
              <InterpretationPanel
                interpretation={phase.interpretation}
                onApprove={() => void handleApprove()}
                onRefine={handleRefine}
                onCancel={handleCancel}
                isLoading={false}
              />
            )}

            {/* Live streaming */}
            {isStreaming && (
              <div className="flex justify-start gap-2.5 animate-slide-up">
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex-shrink-0 flex items-center justify-center mt-0.5">
                  <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div className="flex flex-col gap-1 max-w-[82%] min-w-0">
                  {liveToolCalls.length > 0 && (
                    <div className="w-full"><ToolCallGroup toolCalls={liveToolCalls} /></div>
                  )}
                  {streamingContent ? (
                    <div className="message-assistant">
                      <MarkdownContent content={streamingContent} />
                      <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 rounded-sm align-middle" />
                    </div>
                  ) : liveToolCalls.length === 0 ? (
                    <div className="message-assistant py-3">
                      <div className="typing-indicator">
                        <span /><span /><span />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Session cost summary */}
            {!isStreaming && lastUsage && lastUsage.totalTokens > 0 && (
              <div className="flex justify-center pt-1">
                <span className="text-[10px] text-muted-foreground/40 tabular-nums">
                  {formatTokens(lastUsage.promptTokens)} in · {formatTokens(lastUsage.completionTokens)} out · {formatCost(lastCost)}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Execution timeline (live) ──────────────────────────────────── */}
      {liveExecution && (
        <div className="flex-shrink-0 px-4 pb-2">
          <ExecutionTimeline
            phase={liveExecution.phase}
            statusMessage={liveExecution.statusMessage}
            filesChanged={liveExecution.fileChanges.length}
          />
        </div>
      )}

      {/* ── Input area ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto w-full px-3 py-3 space-y-2">
          {/* Top row */}
          <div className="flex items-center justify-between gap-2">
            <AgentToggle />
            <div className="flex items-center gap-2">
              {/* History button */}
              <button
                type="button"
                onClick={() => {
                  setShowHistory(!showHistory);
                  if (showDiffPanel) setShowDiffPanel(false);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${
                  showHistory
                    ? "bg-primary/10 border-primary/25 text-primary"
                    : "bg-secondary/30 border-border/30 text-muted-foreground/60 hover:text-foreground"
                }`}
                title="Execution history"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">History</span>
              </button>

              {/* Changes/diff button — only visible when there are changes */}
              {hasLiveDiffData && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDiffPanel(!showDiffPanel);
                    if (showHistory) setShowHistory(false);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${
                    showDiffPanel
                      ? "bg-primary/10 border-primary/25 text-primary"
                      : "bg-secondary/30 border-border/30 text-muted-foreground/60 hover:text-foreground"
                  }`}
                  title="View file changes"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="hidden sm:inline">Changes</span>
                  {liveExecution && liveExecution.fileChanges.length > 0 && (
                    <span className="text-[9px] px-1 rounded-full bg-primary/20 text-primary font-medium">
                      {liveExecution.fileChanges.length}
                    </span>
                  )}
                </button>
              )}

              <span className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground/40">
                <span>
                  <kbd className="font-mono bg-secondary/60 px-1 rounded">Enter</kbd> send
                </span>
                <span>
                  <kbd className="font-mono bg-secondary/60 px-1 rounded">Shift+Enter</kbd> newline
                </span>
                {phase.type === "waiting_approval" && (
                  <span className="text-primary/70 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Waiting for approval
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Input box */}
          <div
            className={`flex items-end gap-2 rounded-xl border bg-card transition-colors duration-150 ${
              isStreaming || phase.type === "executing"
                ? "border-primary/25"
                : phase.type === "waiting_approval"
                ? "border-amber-500/25"
                : "border-border/60 focus-within:border-primary/40"
            }`}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isStreaming || phase.type === "executing"
                  ? "Agent is working…"
                  : phase.type === "interpreting"
                  ? "Interpreting your request…"
                  : phase.type === "waiting_approval"
                  ? "Review the interpretation above, then approve or refine…"
                  : "Describe what you need — the AI will interpret before acting…"
              }
              rows={1}
              disabled={isInputDisabled}
              className="flex-1 px-4 py-3 bg-transparent resize-none focus:outline-none text-sm placeholder:text-muted-foreground/40 min-h-[46px] max-h-[200px] disabled:cursor-not-allowed"
            />

            {/* Send / status button */}
            <div className="flex-shrink-0 p-2">
              {isStreaming || phase.type === "executing" ? (
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : phase.type === "interpreting" ? (
                <div className="w-8 h-8 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!input.trim() || phase.type !== "idle"}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                    input.trim() && phase.type === "idle"
                      ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
                      : "bg-secondary text-muted-foreground"
                  }`}
                  title="Send (Enter)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      </div>{/* end main chat column */}

      {/* ── Right side panels ─────────────────────────────────────────── */}
      {showDiffPanel && hasLiveDiffData && (
        <LiveDiffPanel onClose={() => setShowDiffPanel(false)} />
      )}

      {showHistory && (
        <HistoryPanel
          sessionId={currentSession?.id ?? null}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
