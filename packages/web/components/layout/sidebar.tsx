"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useChatStore } from "@/lib/stores/chat-store";
import { useProjectStore, type ProjectItem } from "@/lib/stores/project-store";
import { FileExplorer } from "@/components/explorer/file-explorer";
import { api } from "@/lib/api";

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface GitHubRepo {
  id: number;
  full_name: string;
  html_url: string;
}

type SidebarTab = "sessions" | "explorer" | "projects";

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

  const {
    projects,
    fetchProjects,
    createProject,
    selectProject,
    selectedProject,
  } = useProjectStore();

  const [activeTab, setActiveTab] = useState<SidebarTab>("sessions");
  const [search, setSearch] = useState("");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [projectGitUrl, setProjectGitUrl] = useState("");
  const [projectError, setProjectError] = useState<string | null>(null);

  const [showGitHub, setShowGitHub] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);

  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useEffect(() => { fetchProjects().catch(() => null); }, [fetchProjects]);

  // Switch to explorer tab when project is selected
  useEffect(() => {
    if (selectedProject) setActiveTab("explorer");
  }, [selectedProject]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleNewSession = async () => {
    await createSession({ title: "New session" });
    if (pathname !== "/app") router.push("/app");
    onCloseMobile?.();
  };

  const handleSelectSession = async (id: string) => {
    await selectSession(id);
    if (pathname !== "/app") router.push("/app");
    onCloseMobile?.();
  };

  const handleCreateProject = async () => {
    setProjectError(null);
    if (!projectName.trim()) { setProjectError("Project name is required"); return; }
    if (!projectPath.trim() && !projectGitUrl.trim()) {
      setProjectError("Select a folder or enter a Git URL"); return;
    }
    try {
      const project = await createProject({
        name:      projectName.trim(),
        localPath: projectPath.trim() || undefined,
        gitUrl:    projectGitUrl.trim() || undefined,
      });
      await selectProject(project);
      router.push("/app");
      setProjectName(""); setProjectPath(""); setProjectGitUrl("");
      setShowProjectForm(false);
    } catch (err: unknown) {
      setProjectError(err instanceof Error ? err.message : "Failed to create project");
    }
  };

  const handlePickFolder = () => folderInputRef.current?.click();

  const handleFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const first = files[0] as File & { webkitRelativePath?: string };
    const name = (first.webkitRelativePath || first.name).split("/")[0];
    setProjectPath("/workspace");
    if (!projectName.trim()) setProjectName(name);
  };

  const handleGitHubConnect = async () => {
    setGithubError(null);
    try {
      setLoadingRepos(true);
      const repos = await api.get<GitHubRepo[]>("/api/v1/oauth/github/repos");
      setGithubRepos(repos);
    } catch (err: unknown) {
      setGithubError(err instanceof Error ? err.message : "Failed to connect GitHub");
    } finally {
      setLoadingRepos(false);
    }
  };

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const isHome  = pathname === "/app";
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
        {/* ── Logo + New button ─────────────────────────────────────────── */}
        <div className="flex-shrink-0 h-12 flex items-center justify-between px-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <span className="font-semibold text-sm">MartinCoder</span>
          </div>
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

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex border-b border-border/50">
          {(
            [
              { id: "sessions",  label: "Sessions", icon: (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              ) },
              { id: "explorer",  label: "Explorer", icon: (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              ) },
              { id: "projects",  label: "Projects", icon: (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              ) },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ───────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">

          {/* SESSIONS TAB */}
          {activeTab === "sessions" && (
            <>
              {/* Nav links */}
              <div className="flex-shrink-0 px-2 pt-2 space-y-0.5">
                <button
                  type="button"
                  onClick={() => { router.push("/app"); onCloseMobile?.(); }}
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

              {/* Search */}
              <div className="flex-shrink-0 px-2 pt-2 pb-1">
                <div className="relative">
                  <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

              {/* Session list */}
              <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-0.5">
                {filtered.length === 0 && (
                  <p className="text-xs text-muted-foreground/50 px-2.5 py-6 text-center">
                    {search ? "No sessions found" : "No sessions yet — start a new chat"}
                  </p>
                )}
                {filtered.slice(0, 60).map((session) => (
                  <SessionItem
                    key={session.id}
                    title={session.title}
                    isActive={currentSession?.id === session.id}
                    onSelect={() => void handleSelectSession(session.id)}
                    onDelete={() => void deleteSession(session.id)}
                  />
                ))}
              </div>
            </>
          )}

          {/* EXPLORER TAB */}
          {activeTab === "explorer" && (
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Explorer header */}
              <div className="flex-shrink-0 px-3 py-2 border-b border-border/30 flex items-center justify-between">
                <div className="min-w-0">
                  {selectedProject ? (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-0.5">Project</p>
                      <p className="text-xs font-medium truncate">{selectedProject.name}</p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground/60">No project open</p>
                  )}
                </div>
                {selectedProject && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("projects")}
                    className="icon-btn flex-shrink-0"
                    title="Switch project"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                )}
              </div>
              <FileExplorer className="flex-1 min-h-0" />
            </div>
          )}

          {/* PROJECTS TAB */}
          {activeTab === "projects" && (
            <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
              {/* Existing projects */}
              {projects.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-1 mb-1.5">Open project</p>
                  <div className="space-y-1">
                    {projects.slice(0, 20).map((project: ProjectItem) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={async () => {
                          await selectProject(project);
                          router.push("/app");
                          onCloseMobile?.();
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2.5 ${
                          selectedProject?.id === project.id
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary/30 hover:bg-secondary/60 text-foreground/80"
                        }`}
                      >
                        <svg className="w-4 h-4 flex-shrink-0 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs truncate">{project.name}</p>
                          {project.localPath && (
                            <p className="text-[10px] text-muted-foreground/60 truncate">{project.localPath}</p>
                          )}
                        </div>
                        {selectedProject?.id === project.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* New project form toggle */}
              <button
                type="button"
                onClick={() => setShowProjectForm((v) => !v)}
                className="w-full py-2 px-3 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {showProjectForm ? "Cancel" : "New project"}
              </button>

              {/* New project form */}
              {showProjectForm && (
                <div className="mt-2 space-y-2 p-3 rounded-xl border border-border/50 bg-secondary/20 animate-slide-down">
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Project name"
                    className="w-full px-2.5 py-2 rounded-lg bg-card border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <div className="flex gap-1.5">
                    <input
                      value={projectPath}
                      onChange={(e) => setProjectPath(e.target.value)}
                      placeholder="Local path"
                      className="flex-1 px-2.5 py-2 rounded-lg bg-card border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <button
                      type="button"
                      onClick={handlePickFolder}
                      className="px-2.5 py-2 rounded-lg bg-accent text-xs hover:opacity-90 flex-shrink-0"
                      title="Browse folder"
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
                    className="w-full px-2.5 py-2 rounded-lg bg-card border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
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
                    onClick={() => void handleCreateProject()}
                    className="w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground text-xs hover:opacity-90 font-medium"
                  >
                    Open project
                  </button>
                </div>
              )}

              {/* GitHub section */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowGitHub((v) => !v)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span className="flex-1 text-left font-medium">GitHub</span>
                  <svg className={`w-3 h-3 transition-transform ${showGitHub ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showGitHub && (
                  <div className="mt-2 space-y-2 px-1 animate-slide-down">
                    <input
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="Personal access token"
                      type="password"
                      className="w-full px-2.5 py-2 rounded-lg bg-card border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <button
                      type="button"
                      onClick={() => void handleGitHubConnect()}
                      disabled={!githubToken.trim() || loadingRepos}
                      className="w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground text-xs hover:opacity-90 disabled:opacity-50 font-medium"
                    >
                      {loadingRepos ? "Connecting…" : "Connect"}
                    </button>
                    {githubError && <p className="text-xs text-destructive">{githubError}</p>}
                    {githubRepos.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {githubRepos.slice(0, 20).map((repo) => (
                          <a
                            key={repo.id}
                            href={repo.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-accent text-xs truncate text-muted-foreground hover:text-foreground"
                          >
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ── SessionItem ────────────────────────────────────────────────────────────────

interface SessionItemProps {
  title: string;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SessionItem({ title, isActive, onSelect, onDelete }: SessionItemProps) {
  return (
    <div
      className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${
        isActive ? "bg-primary/10 text-primary" : "hover:bg-accent"
      }`}
      onClick={onSelect}
    >
      <span className="flex-1 text-xs truncate">{title || "Untitled"}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="flex-shrink-0 w-5 h-5 hidden group-hover:flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        title="Delete session"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
