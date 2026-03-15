"use client";

import { useState, useCallback } from "react";
import { useProjectStore, type ProjectFileNode } from "@/lib/stores/project-store";

// ── File type icons ────────────────────────────────────────────────────────────

function getFileIcon(name: string): { icon: string; color: string } {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const base = name.toLowerCase();

  // Special filenames
  if (base === "package.json" || base === "package-lock.json") return { icon: "📦", color: "text-amber-500" };
  if (base === "tsconfig.json" || base === "jsconfig.json") return { icon: "⚙️", color: "text-blue-400" };
  if (base === ".gitignore" || base === ".gitattributes") return { icon: "🔒", color: "text-muted-foreground" };
  if (base === "readme.md" || base === "readme.mdx") return { icon: "📖", color: "text-blue-400" };
  if (base === "dockerfile" || base === "docker-compose.yml" || base === "docker-compose.yaml") return { icon: "🐳", color: "text-blue-500" };
  if (base === ".env" || base.startsWith(".env.")) return { icon: "🔑", color: "text-amber-400" };
  if (base === "next.config.js" || base === "next.config.ts") return { icon: "▲", color: "text-foreground" };
  if (base === "tailwind.config.ts" || base === "tailwind.config.js") return { icon: "🎨", color: "text-cyan-400" };
  if (base === "eslint.config.js" || base === ".eslintrc.js" || base === ".eslintrc.json") return { icon: "✓", color: "text-violet-400" };

  // Extensions
  switch (ext) {
    case "ts":
    case "tsx":   return { icon: "TS", color: "text-blue-400" };
    case "js":
    case "jsx":   return { icon: "JS", color: "text-amber-400" };
    case "json":  return { icon: "{}", color: "text-amber-500" };
    case "css":   return { icon: "🎨", color: "text-blue-300" };
    case "scss":
    case "sass":  return { icon: "🎨", color: "text-pink-400" };
    case "html":  return { icon: "🌐", color: "text-orange-400" };
    case "md":
    case "mdx":   return { icon: "📝", color: "text-blue-300" };
    case "svg":   return { icon: "🖼️", color: "text-amber-300" };
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
    case "gif":   return { icon: "🖼️", color: "text-green-400" };
    case "py":    return { icon: "🐍", color: "text-blue-400" };
    case "go":    return { icon: "Go", color: "text-cyan-400" };
    case "rs":    return { icon: "🦀", color: "text-orange-500" };
    case "sh":
    case "bash":  return { icon: "⚡", color: "text-green-400" };
    case "sql":   return { icon: "🗄️", color: "text-blue-300" };
    case "yaml":
    case "yml":   return { icon: "⚙️", color: "text-amber-300" };
    case "toml":  return { icon: "⚙️", color: "text-orange-400" };
    case "lock":  return { icon: "🔒", color: "text-muted-foreground" };
    default:      return { icon: "📄", color: "text-muted-foreground/70" };
  }
}

// ── Tree node ─────────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: ProjectFileNode;
  depth: number;
  selectedPath: string | null;
  onFileClick: (path: string) => void;
}

function TreeNode({ node, depth, selectedPath, onFileClick }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isDir = node.type === "directory";
  const isSelected = !isDir && node.path === selectedPath;
  const { icon, color } = isDir ? { icon: "", color: "" } : getFileIcon(node.name);

  const indent = depth * 12;

  if (isDir) {
    return (
      <div>
        <button
          type="button"
          className="flex items-center gap-1.5 w-full px-2 py-[3px] rounded hover:bg-accent/50 text-left group transition-colors duration-100"
          style={{ paddingLeft: `${indent + 4}px` }}
          onClick={() => setExpanded((v) => !v)}
        >
          {/* Expand arrow */}
          <svg
            className={`w-3 h-3 text-muted-foreground/50 flex-shrink-0 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
          {/* Folder icon */}
          <span className="text-[13px] flex-shrink-0">
            {expanded ? "📂" : "📁"}
          </span>
          <span className="text-xs text-foreground/80 truncate group-hover:text-foreground transition-colors">
            {node.name}
          </span>
          {/* Child count hint */}
          {node.children && node.children.length > 0 && !expanded && (
            <span className="ml-auto text-[10px] text-muted-foreground/40 pr-1 flex-shrink-0">
              {node.children.length}
            </span>
          )}
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onFileClick={onFileClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`flex items-center gap-1.5 w-full px-2 py-[3px] rounded text-left group transition-colors duration-100 ${
        isSelected
          ? "bg-primary/15 text-primary"
          : "hover:bg-accent/50 text-foreground/70 hover:text-foreground"
      }`}
      style={{ paddingLeft: `${indent + 4 + 12}px` }}
      onClick={() => onFileClick(node.path)}
      title={node.path}
    >
      {/* File icon */}
      <span className={`text-[10px] font-semibold font-mono flex-shrink-0 w-5 text-center leading-none ${color}`}>
        {icon}
      </span>
      <span className="text-xs truncate">{node.name}</span>
    </button>
  );
}

// ── File Explorer ─────────────────────────────────────────────────────────────

interface FileExplorerProps {
  className?: string;
}

export function FileExplorer({ className = "" }: FileExplorerProps) {
  const {
    selectedProject,
    fileTree,
    loadingTree,
    error,
    selectedFilePath,
    openFile,
  } = useProjectStore();

  const handleFileClick = useCallback(
    async (path: string) => {
      try {
        await openFile(path);
      } catch {
        // openFile handles its own error state
      }
    },
    [openFile]
  );

  if (!selectedProject) {
    return (
      <div className={`flex flex-col items-center justify-center py-10 px-4 text-center ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-[140px]">
          Open a project to browse files
        </p>
      </div>
    );
  }

  if (loadingTree) {
    return (
      <div className={`p-3 space-y-1.5 ${className}`}>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="shimmer h-5 rounded"
            style={{ width: `${55 + Math.sin(i) * 30}%`, marginLeft: `${(i % 3) * 8}px` }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-3 leading-relaxed">
          {error}
        </div>
      </div>
    );
  }

  if (fileTree.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-8 px-4 text-center ${className}`}>
        <p className="text-xs text-muted-foreground/60">No files found</p>
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto overflow-x-hidden py-1 ${className}`}>
      {fileTree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedFilePath}
          onFileClick={handleFileClick}
        />
      ))}
    </div>
  );
}
