"use client";

import { create } from "zustand";
import { api } from "@/lib/api";

export interface ProjectItem {
  id: string;
  name: string;
  localPath: string | null;
  gitUrl: string | null;
}

export interface ProjectFileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: ProjectFileNode[];
}

interface RawProjectFile {
  path: string;
  type: string;
}

interface ProjectStore {
  projects: ProjectItem[];
  selectedProject: ProjectItem | null;
  fileTree: ProjectFileNode[];
  selectedFilePath: string | null;
  selectedFileContent: string;
  loadingTree: boolean;
  editorOpen: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  createProject: (payload: {
    name: string;
    localPath?: string;
    gitUrl?: string;
  }) => Promise<ProjectItem>;
  selectProject: (project: ProjectItem) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  setEditorOpen: (open: boolean) => void;
}

function toProjectItem(input: Record<string, unknown>): ProjectItem {
  return {
    id: String(input.id),
    name: String(input.name ?? "Project"),
    localPath: (input.localPath as string | null) ?? null,
    gitUrl: (input.gitUrl as string | null) ?? null,
  };
}

function buildFileTree(files: RawProjectFile[], rootPath?: string | null): ProjectFileNode[] {
  const roots: ProjectFileNode[] = [];

  const normalize = (value: string) => value.replace(/\\/g, "/");
  const normalizedRoot = rootPath ? normalize(rootPath).replace(/\/$/, "") : "";

  for (const item of files) {
    const fullPath = normalize(item.path);
    const relative = normalizedRoot && fullPath.startsWith(`${normalizedRoot}/`)
      ? fullPath.slice(normalizedRoot.length + 1)
      : fullPath;

    const parts = relative.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    let cursor = roots;
    let assembled = "";

    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      assembled = assembled ? `${assembled}/${part}` : part;
      const isLast = i === parts.length - 1;
      const nodeType: "file" | "directory" =
        isLast && item.type === "file" ? "file" : "directory";
      let current = cursor.find((n) => n.name === part);
      if (!current) {
        current = {
          name: part,
          path: assembled,
          type: nodeType,
          children: nodeType === "directory" ? [] : undefined,
        };
        cursor.push(current);
      }
      if (current.type === "directory") {
        if (!current.children) current.children = [];
        cursor = current.children;
      }
    }
  }

  const sortNodes = (nodes: ProjectFileNode[]): ProjectFileNode[] =>
    nodes
      .map((node) => ({
        ...node,
        children: node.children ? sortNodes(node.children) : undefined,
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

  return sortNodes(roots);
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  selectedProject: null,
  fileTree: [],
  selectedFilePath: null,
  selectedFileContent: "",
  loadingTree: false,
  editorOpen: false,
  error: null,

  fetchProjects: async () => {
    const data = await api.get<{ projects: Record<string, unknown>[] }>("/projects");
    set({ projects: (data.projects || []).map(toProjectItem) });
  },

  createProject: async (payload) => {
    const data = await api.post<{ project: Record<string, unknown> }>("/projects", {
      name: payload.name,
      localPath: payload.localPath || undefined,
      gitUrl: payload.gitUrl || undefined,
    });
    const project = toProjectItem(data.project);
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },

  selectProject: async (project) => {
    set({
      selectedProject: project,
      loadingTree: true,
      error: null,
      editorOpen: true,
      selectedFilePath: null,
      selectedFileContent: "",
    });

    try {
      const data = await api.get<{ files: RawProjectFile[] }>(
        `/projects/${project.id}/files?depth=8`
      );
      const tree = buildFileTree(data.files || [], project.localPath);
      set({ fileTree: tree, loadingTree: false });
    } catch (err) {
      // Auto-heal invalid localPath in Docker by retrying with /workspace.
      try {
        const updated = await api.patch<{ project: Record<string, unknown> }>(
          `/projects/${project.id}`,
          { localPath: "/workspace" }
        );
        const normalized = toProjectItem(updated.project);
        const data = await api.get<{ files: RawProjectFile[] }>(
          `/projects/${project.id}/files?depth=8`
        );
        const tree = buildFileTree(data.files || [], normalized.localPath);
        set((state) => ({
          projects: state.projects.map((p) => (p.id === normalized.id ? normalized : p)),
          selectedProject: normalized,
          fileTree: tree,
          loadingTree: false,
          error: null,
        }));
      } catch {
        const message = err instanceof Error ? err.message : "Failed to load project files";
        set({ error: message, fileTree: [], loadingTree: false });
      }
    }
  },

  openFile: async (path) => {
    const project = get().selectedProject;
    if (!project) return;

    const fullPath =
      project.localPath && !path.startsWith("/") && !/^[A-Za-z]:\\/.test(path)
        ? `${project.localPath.replace(/[\\/]$/, "")}/${path}`
        : path;

    const data = await api.post<{ content?: string; error?: string }>("/files/read", {
      path: fullPath,
    });

    if (data.error) {
      throw new Error(data.error);
    }

    set({
      selectedFilePath: path,
      selectedFileContent: data.content || "",
      editorOpen: true,
    });
  },

  setEditorOpen: (open) => set({ editorOpen: open }),
}));
