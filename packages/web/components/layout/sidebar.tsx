"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useChatStore } from "@/lib/stores/chat-store";
import { api } from "@/lib/api";

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface Project {
  id: string;
  name: string;
}

interface GitHubRepo {
  id: number;
  full_name: string;
  html_url: string;
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const router   = useRouter();
  const pathname = usePathname();

  const {
    sessions,
    currentSession,
    fetchSessions,
    selectSession,
    createSession,
    deleteSession,
  } = useChatStore();

  const [search, setSearch]               = useState("");
  const [projects, setProjects]           = useState<Project[]>([]);
  const [showProjects, setShowProjects]   = useState(false);
  const [projectName, setProjectName]     = useState("");
  const [projectPath, setProjectPath]     = useState("");
  const [projectGitUrl, setProjectGitUrl] = useState("");
  const [projectError, setProjectError]   = useState<string | null>(null);

  const [showGitHub, setShowGitHub]       = useState(false);
  const [githubToken, setGithubToken]     = useState("");
  const [githubRepos, setGithubRepos]     = useState<GitHubRepo[]>([]);
  const [githubError, setGithubError]     = useState<string | null>(null);
  const [loadingRepos, setLoadingRepos]   = useState(false);

  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch sessions on mount
  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Fetch projects on mount
  useEffect(() => {
    api.get<Project[]>("/api/v1/projects")
      .then(setProjects)
      .catch(() => null);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleNewSession = async () => {
    await createSession({ title: "New session" });
    if (pathname !== "/") router.push("/");
    onCloseMobile?.();
  };

  const handleSelectSession = async (id: string) => {
    await selectSession(id);
    if (pathname !== "/") router.push("/");
    onCloseMobile?.();
  };

  const handleCreateProject = async () => {
    setProjectError(null);
    if (!projectName.trim()) { setProjectError("Project name is required"); return; }
    if (!projectPath.trim() && !projectGitUrl.trim()) {
      setProjectError("Select a folder or enter a Git URL"); return;
    }
    try {
      const p = await api.post<Project>("/api/v1/projects", {
        name:       projectName.trim(),
        local_path: projectPath.trim() || undefined,
        git_url:    projectGitUrl.trim() || undefined,
      });
      setProjects((prev) => [p, ...prev]);
      setProjectName(""); setProjectPath(""); setProjectGitUrl("");
      setShowProjects(false);
    } catch (err: unknown) {
      setProjectError(err instanceof Error ? err.message : "Failed to create project");
    }
  };

  const handleGitHubConnect = async () => {
    setGithubError(null);
    try {
      await api.post("/api/v1/oauth/github/token", { token: githubToken });
      setGithubToken("");
      setLoadingRepos(true);
      const repos = await api.get<GitHubRepo[]>("/api/v1/oauth/github/repos");
      setGithubRepos(repos);
      setGithubError(null);
    } catch (err: unknown) {
      setGithubError(err instanceof Error ? err.message : "Failed to connect GitHub");
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const first = files[0] as File & { webkitRelativePath?: string };
    const name = (first.webkitRelativePath || first.name).split("/")[0];
    setProjectPath(name);
    if (!projectName.trim()) setProjectName(name);
  };

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const isHome  = pathname === "/";
  const isDrive = pathname === "/drive";

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={onCloseMobile}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={[
          "fixed md:static top-0 left-0 h-full z-50 md:z-auto",
          "flex flex-col bg-card border-r border-border/50",
          "transition-transform duration-300 md:transition-none",
          "w-[280px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 p-3 border-b border-border/50 space-y-2">
          {/* Logo + new button */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <span className="font-semibold text-sm flex-1">Martin-Coder</span>
            <button
              type="button"
              onClick={handleNewSession}
              className="icon-btn"
              title="New session"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search sessions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary/50 border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        {/* ── Nav ─────────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-2 pt-2 space-y-0.5">
          <button
            type="button"
            onClick={() => { router.push("/"); onCloseMobile?.(); }}
            className={`sidebar-item w-full text-left ${isHome ? "active" : ""}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Chat</span>
          </button>
          <button
            type="button"
            onClick={() => { router.push("/drive"); onCloseMobile?.(); }}
            className={`sidebar-item w-full text-left ${isDrive ? "active" : ""}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
            <span>Drive</span>
          </button>
        </div>

        {/* ── Session list ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-0.5">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground/50 px-2.5 py-4 text-center">
              {search ? "No sessions found" : "No sessions yet"}
            </p>
          )}
          {filtered.slice(0, 60).map((session) => (
            <SessionItem
              key={session.id}
              title={session.title}
              isActive={currentSession?.id === session.id}
              onSelect={() => handleSelectSession(session.id)}
              onDelete={() => deleteSession(session.id)}
            />
          ))}
        </div>

        {/* ── Bottom panels ────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-border/50 px-2 py-2 space-y-1">
          {/* Projects */}
          <button
            type="button"
            onClick={() => setShowProjects((v) => !v)}
            className="sidebar-item w-full text-left"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="flex-1">Projects</span>
            <svg className={`w-3 h-3 transition-transform ${showProjects ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showProjects && (
            <div className="px-1 py-1 space-y-2 animate-slide-down">
              {/* Existing projects */}
              {projects.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/40 text-xs truncate">
                  <svg className="w-3 h-3 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="truncate">{p.name}</span>
                </div>
              ))}

              {/* New project form */}
              <div className="space-y-1.5 p-2 rounded-lg border border-dashed border-border/60">
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-secondary/60 border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <div className="flex gap-1.5">
                  <input
                    value={projectPath}
                    onChange={(e) => setProjectPath(e.target.value)}
                    placeholder="Path or folder"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-secondary/60 border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="px-2 py-1.5 rounded-lg bg-accent text-xs hover:opacity-90"
                    title="Pick folder"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </button>
                </div>
                <input
                  value={projectGitUrl}
                  onChange={(e) => setProjectGitUrl(e.target.value)}
                  placeholder="Git URL (optional)"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-secondary/60 border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFolderSelected}
                  {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
                />
                {projectError && <p className="text-xs text-destructive">{projectError}</p>}
                <button
                  type="button"
                  onClick={handleCreateProject}
                  className="w-full py-1.5 px-3 rounded-lg bg-primary text-primary-foreground text-xs hover:opacity-90"
                >
                  Create project
                </button>
              </div>
            </div>
          )}

          {/* GitHub */}
          <button
            type="button"
            onClick={() => setShowGitHub((v) => !v)}
            className="sidebar-item w-full text-left"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span className="flex-1">GitHub</span>
            <svg className={`w-3 h-3 transition-transform ${showGitHub ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showGitHub && (
            <div className="px-1 py-1 space-y-1.5 animate-slide-down">
              <input
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="Personal access token"
                type="password"
                className="w-full px-2.5 py-1.5 rounded-lg bg-secondary/60 border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={handleGitHubConnect}
                disabled={!githubToken.trim() || loadingRepos}
                className="w-full py-1.5 px-3 rounded-lg bg-primary text-primary-foreground text-xs hover:opacity-90 disabled:opacity-50"
              >
                {loadingRepos ? "Connecting…" : "Connect"}
              </button>
              {githubError && <p className="text-xs text-destructive">{githubError}</p>}
              {githubRepos.length > 0 && (
                <div className="max-h-28 overflow-y-auto space-y-1 pt-1">
                  {githubRepos.slice(0, 20).map((repo) => (
                    <a
                      key={repo.id}
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-accent text-xs truncate"
                    >
                      <svg className="w-3 h-3 flex-shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {repo.full_name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ── SessionItem ───────────────────────────────────────────────────────────────

function SessionItem({
  title,
  isActive,
  onSelect,
  onDelete,
}: {
  title: string;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={`group relative flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm transition-all duration-100 ${
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      <svg
        className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <span className="flex-1 truncate text-sm">{title}</span>

      {showDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
