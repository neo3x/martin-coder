"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Dynamic import for Monaco Editor (client-side only)
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-muted">
      Loading editor...
    </div>
  ),
});

interface EditorPanelProps {
  initialValue?: string;
  language?: string;
  onChange?: (value: string | undefined) => void;
}

export function EditorPanel({
  initialValue = "",
  language = "typescript",
  onChange,
}: EditorPanelProps) {
  const [value, setValue] = useState(initialValue);
  const [currentLanguage, setCurrentLanguage] = useState(language);

  const languages = [
    { id: "typescript", name: "TypeScript" },
    { id: "javascript", name: "JavaScript" },
    { id: "python", name: "Python" },
    { id: "java", name: "Java" },
    { id: "go", name: "Go" },
    { id: "rust", name: "Rust" },
    { id: "cpp", name: "C++" },
    { id: "csharp", name: "C#" },
    { id: "html", name: "HTML" },
    { id: "css", name: "CSS" },
    { id: "json", name: "JSON" },
    { id: "yaml", name: "YAML" },
    { id: "markdown", name: "Markdown" },
    { id: "sql", name: "SQL" },
    { id: "shell", name: "Shell" },
  ];

  const handleEditorChange = (value: string | undefined) => {
    setValue(value || "");
    onChange?.(value);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="h-10 border-b flex items-center justify-between px-4 bg-card">
        <div className="flex items-center gap-2">
          <select
            value={currentLanguage}
            onChange={(e) => setCurrentLanguage(e.target.value)}
            className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm border-0 focus:ring-2 focus:ring-primary"
          >
            {languages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">Untitled</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-1.5 hover:bg-accent rounded"
            title="Format Document"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <button
            className="p-1.5 hover:bg-accent rounded"
            title="Copy"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            className="p-1.5 hover:bg-accent rounded"
            title="Save"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <MonacoEditor
          height="100%"
          language={currentLanguage}
          value={value}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            padding: { top: 16 },
          }}
        />
      </div>
    </div>
  );
}
