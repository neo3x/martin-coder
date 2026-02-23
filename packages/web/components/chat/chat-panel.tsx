"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useChatStore } from "@/lib/stores/chat-store";
import { ToolCallGroup, type ToolCallItem } from "@/components/chat/tool-call-view";
import { SmartPrompts } from "@/components/chat/smart-prompts";

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
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// ── Copy button for code blocks ───────────────────────────────────────────────

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

function MessageItem({
  role,
  content,
  toolCalls,
  createdAt,
  tokens,
  cost,
}: MessageItemProps) {
  const isUser = role === "user";
  if (role === "system" || role === "tool") return null;

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2.5 animate-slide-up`}
    >
      {/* AI avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex-shrink-0 flex items-center justify-center mt-0.5">
          <svg
            className="w-4 h-4 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        </div>
      )}

      {/* Content */}
      <div
        className={`flex flex-col gap-1 max-w-[82%] min-w-0 ${isUser ? "items-end" : "items-start"}`}
      >
        {/* Tool call steps */}
        {!isUser && toolCalls && toolCalls.length > 0 && (
          <div className="w-full">
            <ToolCallGroup toolCalls={toolCalls} />
          </div>
        )}

        {/* Message bubble */}
        {content && (
          <div className={isUser ? "message-user" : "message-assistant"}>
            {isUser ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
            ) : (
              <MarkdownContent content={content} />
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/45">
          {createdAt && <span>{timeLabel(createdAt)}</span>}
          {tokens != null && tokens > 0 && (
            <span>{formatTokens(tokens)} tokens</span>
          )}
          {cost != null && cost > 0 && <span>{formatCost(cost)}</span>}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-primary flex-shrink-0 flex items-center justify-center mt-0.5">
          <svg
            className="w-3.5 h-3.5 text-primary-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
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
    <div className="flex items-center gap-0.5 p-0.5 bg-secondary/50 rounded-lg">
      <button
        type="button"
        onClick={() => setAgent("build")}
        className={`agent-tab ${selectedAgent === "build" ? "active" : ""}`}
        title="Build mode: full read/write and bash access"
      >
        Build
      </button>
      <button
        type="button"
        onClick={() => setAgent("plan")}
        className={`agent-tab ${selectedAgent === "plan" ? "active" : ""}`}
        title="Plan mode: read-only analysis and planning"
      >
        Plan
      </button>
    </div>
  );
}

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
  } = useChatStore();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEmpty = messages.length === 0 && !isStreaming;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent, streamingToolCalls.length]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  const handleSubmit = useCallback(
    async (overrideText?: string) => {
      const msg = (overrideText ?? input).trim();
      if (!msg || isStreaming) return;
      setInput("");

      if (!currentSession) {
        await createSession({ title: msg.slice(0, 60) });
      }
      await sendMessage(msg);
    },
    [input, isStreaming, currentSession, createSession, sendMessage]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  // Map streamingToolCalls to ToolCallItem for the ToolCallGroup component
  const liveToolCalls: ToolCallItem[] = streamingToolCalls.map((tc) => ({
    id:        tc.id,
    name:      tc.name,
    arguments: tc.arguments,
    result:    tc.result,
    error:     tc.error,
    status:    tc.status,
  }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Conversation area ────────────────────────────────────────────── */}
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
              const toolCalls: ToolCallItem[] = (msg.toolCalls ?? []).map(
                (tc) => ({
                  id:        tc.id,
                  name:      tc.name,
                  arguments: tc.arguments,
                  status:    "done" as const,
                })
              );
              return (
                <MessageItem
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  toolCalls={toolCalls.length > 0 ? toolCalls : undefined}
                  createdAt={msg.createdAt}
                  tokens={
                    (msg.promptTokens ?? 0) + (msg.completionTokens ?? 0)
                  }
                  cost={msg.costUsd}
                />
              );
            })}

            {/* Live streaming message */}
            {isStreaming && (
              <div className="flex justify-start gap-2.5 animate-slide-up">
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex-shrink-0 flex items-center justify-center mt-0.5">
                  <svg
                    className="w-4 h-4 text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>

                <div className="flex flex-col gap-1 max-w-[82%] min-w-0">
                  {/* Live tool calls */}
                  {liveToolCalls.length > 0 && (
                    <div className="w-full">
                      <ToolCallGroup toolCalls={liveToolCalls} />
                    </div>
                  )}

                  {/* Streaming text */}
                  {streamingContent ? (
                    <div className="message-assistant">
                      <MarkdownContent content={streamingContent} />
                      <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 rounded-sm align-middle" />
                    </div>
                  ) : liveToolCalls.length === 0 ? (
                    <div className="message-assistant py-3">
                      <div className="typing-indicator">
                        <span />
                        <span />
                        <span />
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
                  {formatTokens(lastUsage.promptTokens)} in ·{" "}
                  {formatTokens(lastUsage.completionTokens)} out ·{" "}
                  {formatCost(lastCost)}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input area ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto w-full px-3 py-3 space-y-2">
          {/* Top row: agent toggle + hint */}
          <div className="flex items-center justify-between">
            <AgentToggle />
            <span className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground/40">
              <span>
                <kbd className="font-mono bg-secondary/60 px-1 rounded">Enter</kbd> send
              </span>
              <span>
                <kbd className="font-mono bg-secondary/60 px-1 rounded">Shift+Enter</kbd> newline
              </span>
            </span>
          </div>

          {/* Input box */}
          <div
            className={`flex items-end gap-2 rounded-xl border bg-card transition-colors duration-150 ${
              isStreaming
                ? "border-primary/25"
                : "border-border/60 focus-within:border-primary/40"
            }`}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isStreaming
                  ? "Agent is working…"
                  : "Describe what you need, paste code to debug/review, or pick a template above…"
              }
              rows={1}
              disabled={isStreaming}
              className="flex-1 px-4 py-3 bg-transparent resize-none focus:outline-none text-sm placeholder:text-muted-foreground/40 min-h-[46px] max-h-[200px]"
            />

            {/* Send button */}
            <div className="flex-shrink-0 p-2">
              {isStreaming ? (
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-primary animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!input.trim()}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                    input.trim()
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "bg-secondary text-muted-foreground"
                  }`}
                  title="Send (Enter)"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
