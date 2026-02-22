"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useThemeStore } from "@/lib/stores/theme-store";
import { useProjectStore, type ProjectFileNode } from "@/lib/stores/project-store";
import { api } from "@/lib/api";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-muted">
      Loading editor...
    </div>
  ),
});

interface EditorPanelProps {
  onClose?: () => void;
}

function FileTreeNode({
  node,
  onOpenFile,
  selectedPath,
  level = 0,
}: {
  node: ProjectFileNode;
  onOpenFile: (path: string) => void;
  selectedPath: string | null;
  level?: number;
}) {
  const [open, setOpen] = useState(level < 2);
  const isFile = node.type === "file";
  const isSelected = selectedPath === node.path;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (isFile) onOpenFile(node.path);
          else setOpen((v) => !v);
        }}
        className={`w-full flex items-center gap-2 px-2 py-1 text-xs rounded-md text-left ${
          isSelected ? "bg-primary/15 text-primary" : "hover:bg-accent/60"
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {!isFile ? (
          <span className="w-3">{open ? "▾" : "▸"}</span>
        ) : (
          <span className="w-3">•</span>
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {!isFile && open && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={`${node.path}/${child.name}`}
              node={child}
              onOpenFile={onOpenFile}
              selectedPath={selectedPath}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function EditorPanel({ onClose }: EditorPanelProps) {
  const { resolvedTheme } = useThemeStore();
  const {
    selectedProject,
    fileTree,
    selectedFilePath,
    selectedFileContent,
    loadingTree,
    error,
    openFile,
  } = useProjectStore();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setValue(selectedFileContent || "");
  }, [selectedFileContent, selectedFilePath]);

  const currentLanguage = useMemo(() => {
    const path = selectedFilePath || "";
    const ext = path.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
      case "tsx":
        return "typescript";
      case "js":
      case "jsx":
        return "javascript";
      case "py":
        return "python";
      case "json":
        return "json";
      case "md":
        return "markdown";
      case "css":
        return "css";
      case "html":
        return "html";
      case "yml":
      case "yaml":
        return "yaml";
      case "sh":
        return "shell";
      default:
        return "plaintext";
    }
  }, [selectedFilePath]);

  const saveCurrentFile = async () => {
    if (!selectedProject || !selectedFilePath) return;
    const fullPath = selectedProject.localPath
      ? `${selectedProject.localPath.replace(/[\\/]$/, "")}/${selectedFilePath}`
      : selectedFilePath;

    setSaving(true);
    setSaveMessage(null);
    try {
      await api.post("/files/write", {
        path: fullPath,
        content: value,
      });
      setSaveMessage("Saved");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  return (
    <div className="h-full flex">
      <aside className="w-64 border-r border-border/50 bg-card/40 overflow-y-auto">
        <div className="p-3 border-b border-border/50">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Explorer
          </p>
          <p className="text-sm font-medium truncate mt-1">
            {selectedProject?.name || "No project selected"}
          </p>
        </div>

        <div className="p-2 space-y-1">
          {loadingTree && <p className="text-xs text-muted-foreground p-2">Loading files...</p>}
          {!loadingTree && error && (
            <p className="text-xs text-destructive p-2 break-words">{error}</p>
          )}
          {!loadingTree && !error && fileTree.length === 0 && (
            <p className="text-xs text-muted-foreground p-2">
              No files loaded. Select a project with a valid `localPath`.
            </p>
          )}
          {fileTree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              onOpenFile={openFile}
              selectedPath={selectedFilePath}
            />
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <div className="h-10 border-b flex items-center justify-between px-4 bg-card">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-muted-foreground truncate">
              {selectedFilePath || "Open a file from Explorer"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {saveMessage && (
              <span className="text-xs text-muted-foreground">{saveMessage}</span>
            )}
            <button
              type="button"
              onClick={saveCurrentFile}
              disabled={!selectedFilePath || saving}
              className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50"
              title="Save"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-accent rounded"
                title="Close Editor"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1">
          <MonacoEditor
            height="100%"
            language={currentLanguage}
            value={value}
            onChange={(next) => setValue(next || "")}
            theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "off",
              padding: { top: 12 },
              readOnly: !selectedFilePath,
            }}
          />
        </div>
      </div>
    </div>
  );
}

