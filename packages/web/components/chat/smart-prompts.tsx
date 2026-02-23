"use client";

interface SmartPromptsProps {
  onPrompt: (text: string) => void;
}

const CATEGORIES = [
  {
    label: "Generate",
    color: "blue" as const,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    prompts: [
      {
        label: "REST API endpoint",
        text: "Generate a complete REST API endpoint for: [describe what the endpoint should do]\n\nInclude:\n- Request/response types\n- Input validation\n- Error handling\n- Example usage",
      },
      {
        label: "React component",
        text: "Build a React component with TypeScript that: [describe the component]\n\nInclude:\n- Props interface\n- State management\n- Responsive styling with Tailwind\n- Loading and error states",
      },
      {
        label: "Database schema",
        text: "Design a database schema for: [describe your domain]\n\nInclude:\n- Table definitions with types\n- Relationships and foreign keys\n- Indexes for performance\n- Migration SQL",
      },
      {
        label: "CLI tool",
        text: "Create a CLI tool in TypeScript/Node.js that: [describe what the CLI does]\n\nInclude:\n- Argument parsing\n- Help text\n- Error handling\n- Example commands",
      },
    ],
  },
  {
    label: "Debug & Fix",
    color: "red" as const,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    prompts: [
      {
        label: "Fix this bug",
        text: "Find and fix the bug in this code:\n\n```\n[paste your code here]\n```\n\nError message:\n```\n[paste the error here]\n```",
      },
      {
        label: "Debug runtime error",
        text: "Debug this runtime error and provide a fix:\n\n```\n[paste the error/stack trace here]\n```\n\nRelevant code:\n```\n[paste your code here]\n```",
      },
      {
        label: "Fix failing tests",
        text: "Fix these failing tests:\n\n```\n[paste test code here]\n```\n\nTest output:\n```\n[paste the failure output here]\n```",
      },
      {
        label: "Performance issue",
        text: "This code is slow. Identify the bottleneck and optimize it:\n\n```\n[paste your code here]\n```\n\nCurrent behavior: [describe what's slow]",
      },
    ],
  },
  {
    label: "Refactor",
    color: "amber" as const,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    prompts: [
      {
        label: "Improve code quality",
        text: "Refactor this code to improve readability, maintainability and performance. Follow best practices:\n\n```\n[paste your code here]\n```",
      },
      {
        label: "Add TypeScript types",
        text: "Add proper TypeScript types and interfaces to this JavaScript code:\n\n```javascript\n[paste your JS code here]\n```",
      },
      {
        label: "Add error handling",
        text: "Add comprehensive error handling and input validation to this code:\n\n```\n[paste your code here]\n```\n\nHandle: network errors, invalid inputs, edge cases",
      },
      {
        label: "Split into modules",
        text: "Refactor this large file into smaller, well-organized modules:\n\n```\n[paste your code here]\n```\n\nGoal: [describe the desired structure]",
      },
    ],
  },
  {
    label: "Review & Test",
    color: "green" as const,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    prompts: [
      {
        label: "Code review",
        text: "Do a thorough code review. Check for bugs, security vulnerabilities, performance issues and style:\n\n```\n[paste your code here]\n```",
      },
      {
        label: "Write unit tests",
        text: "Write comprehensive unit tests for this code using the appropriate testing framework (Jest/Vitest):\n\n```\n[paste your code here]\n```\n\nInclude: happy paths, edge cases, error cases",
      },
      {
        label: "Security audit",
        text: "Audit this code for security vulnerabilities (OWASP Top 10, injection, auth issues, etc.):\n\n```\n[paste your code here]\n```",
      },
      {
        label: "Explain this code",
        text: "Explain this code step by step. What does each part do and why?\n\n```\n[paste your code here]\n```",
      },
    ],
  },
] as const;

type Category = (typeof CATEGORIES)[number];

const colorStyles: Record<Category["color"], { border: string; label: string; icon: string; hover: string }> = {
  blue: {
    border: "border-blue-500/20",
    label: "text-blue-400",
    icon:  "text-blue-400",
    hover: "hover:border-blue-500/40 hover:bg-blue-500/5",
  },
  red: {
    border: "border-red-500/20",
    label: "text-red-400",
    icon:  "text-red-400",
    hover: "hover:border-red-500/40 hover:bg-red-500/5",
  },
  amber: {
    border: "border-amber-500/20",
    label: "text-amber-400",
    icon:  "text-amber-400",
    hover: "hover:border-amber-500/40 hover:bg-amber-500/5",
  },
  green: {
    border: "border-emerald-500/20",
    label: "text-emerald-400",
    icon:  "text-emerald-400",
    hover: "hover:border-emerald-500/40 hover:bg-emerald-500/5",
  },
};

export function SmartPrompts({ onPrompt }: SmartPromptsProps) {
  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto px-4 pb-4">
      {/* Hero */}
      <div className="text-center space-y-3 pt-10 pb-8">
        <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Martin-Coder</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          AI agent that reads, writes and runs code autonomously.
          Select a template or describe what you need.
        </p>
      </div>

      {/* Prompt grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-5">
        {CATEGORIES.map((cat) => {
          const styles = colorStyles[cat.color];
          return (
            <div key={cat.label} className="space-y-2">
              {/* Category header */}
              <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${styles.label}`}>
                <span className={styles.icon}>{cat.icon}</span>
                {cat.label}
              </div>

              {/* Prompt buttons */}
              <div className="space-y-1.5">
                {cat.prompts.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => onPrompt(p.text)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all duration-150 ${styles.border} ${styles.hover} text-foreground/75 hover:text-foreground`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer tip */}
      <p className="mt-6 text-xs text-muted-foreground/50 text-center">
        Templates pre-fill the input — replace the <code className="bg-muted px-1 rounded">[placeholders]</code> with your content
      </p>
    </div>
  );
}
