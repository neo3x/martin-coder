"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
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

interface OAuthProvidersStatus {
  github: boolean;
  google: boolean;
}

interface GitHubRepo {
  id: number;
  full_name: string;
  html_url: string;
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const t = useTranslations("sidebar");
  const { chats, currentChat, fetchChats, selectChat, createChat, deleteChat } =
    useChatStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [projectGitUrl, setProjectGitUrl] = useState("");
  const [projectError, setProjectError] = useState<string | null>(null);

  const [oauthStatus, setOauthStatus] = useState<OAuthProvidersStatus | null>(null);
  const [showGithubPanel, setShowGithubPanel] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);

  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    const init = async () => {
      try {
        const [projectData, oauthData] = await Promise.all([
          api.get<Project[]>("/api/v1/projects"),
          api.get<OAuthProvidersStatus>("/api/v1/oauth/providers"),
        ]);
        setProjects(projectData);
        setOauthStatus(oauthData);
      } catch (err) {
        console.error("Failed to initialize sidebar:", err);
      }
    };
    init();
  }, []);

  const loadGitHubRepos = async () => {
    setLoadingRepos(true);
    try {
      const repos = await api.get<GitHubRepo[]>("/api/v1/oauth/github/repos");
      setGithubRepos(repos);
      setGithubConnected(true);
      setGithubError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "GitHub not connected";
      setGithubError(message);
      setGithubConnected(false);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleNewChat = async () => {
    await createChat({ title: "New Chat" });
    onCloseMobile?.();
  };

  const handleCreateProject = async () => {
    setProjectError(null);
    if (!projectName.trim()) {
      setProjectError("Project name is required");
      return;
    }
    if (!projectPath.trim() && !projectGitUrl.trim()) {
      setProjectError("Select a folder path or provide Git URL");
      return;
    }

    try {
      const project = await api.post<Project>("/api/v1/projects", {
        name: projectName.trim(),
        local_path: projectPath.trim() || undefined,
        git_url: projectGitUrl.trim() || undefined,
      });
      setProjects((prev) => [project, ...prev]);
      setProjectName("");
      setProjectPath("");
      setProjectGitUrl("");
      setShowProjectForm(false);
    } catch (err: unknown) {
      setProjectError(err instanceof Error ? err.message : "Failed to create project");
    }
  };

  const handlePickFolder = () => folderInputRef.current?.click();

  const handleFolderSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const first = files[0] as File & { webkitRelativePath?: string };
    const relativePath = first.webkitRelativePath || first.name;
    const folderName = relativePath.split("/")[0] || relativePath;
    setProjectPath(folderName);
    if (!projectName.trim()) setProjectName(folderName);
  };

  const handleGitHubTokenConnect = async () => {
    setGithubError(null);
    try {
      await api.post("/api/v1/oauth/github/token", { token: githubToken });
      setGithubToken("");
      await loadGitHubRepos();
    } catch (err: unknown) {
      setGithubError(err instanceof Error ? err.message : "Failed to connect GitHub");
    }
  };

  const handleGitHubOAuthConnect = async () => {
    setGithubError(null);
    try {
      const redirectUri = window.location.origin;
      const data = await api.get<{ authorization_url: string }>(
        `/api/v1/oauth/github/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`
      );
      window.location.href = data.authorization_url;
    } catch (err: unknown) {
      setGithubError(err instanceof Error ? err.message : "GitHub OAuth is not configured");
    }
  };

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
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
          "border-r border-border/50 bg-card/95 md:bg-card/40 backdrop-blur-xl md:backdrop-blur-0",
          "flex flex-col transition-transform duration-300 md:transition-all",
          "w-[86vw] max-w-[320px]",
          isCollapsed ? "md:w-16" : "md:w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="p-3 md:p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            {(!isCollapsed || mobileOpen) && (
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Chats
              </h2>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="icon-btn ml-auto hidden md:inline-flex"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              <svg className={`w-4 h-4 transition-transform ${isCollapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          <button
            onClick={handleNewChat}
            className={`w-full btn-gradient flex items-center justify-center gap-2 ${isCollapsed ? "p-3" : ""}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {(!isCollapsed || mobileOpen) && <span>{t("newChat")}</span>}
          </button>

          {(!isCollapsed || mobileOpen) && (
            <div className="mt-3 relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-secondary/60 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
              />
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
          {filteredChats.slice(0, 50).map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              isActive={currentChat?.id === chat.id}
              onSelect={async () => {
                await selectChat(chat.id);
                onCloseMobile?.();
              }}
              onDelete={() => deleteChat(chat.id)}
            />
          ))}
        </div>

        {(!isCollapsed || mobileOpen) && (
          <div className="flex-shrink-0 max-h-[45vh] overflow-y-auto border-t border-border/50 p-3 md:p-4 space-y-4">
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {t("projects")}
              </h3>
              <button
                onClick={() => setShowProjectForm((prev) => !prev)}
                className="w-full py-2.5 px-4 border border-dashed border-border/60 rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
              >
                {t("openProject")}
              </button>
              {showProjectForm && (
                <div className="mt-3 space-y-2">
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Project name"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div className="flex flex-col gap-2">
                    <input
                      value={projectPath}
                      onChange={(e) => setProjectPath(e.target.value)}
                      placeholder="Project path"
                      className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                      type="button"
                      onClick={handlePickFolder}
                      className="w-full px-3 py-2 rounded-lg bg-accent text-foreground text-sm hover:opacity-90"
                    >
                      Buscar
                    </button>
                  </div>
                  <input
                    ref={folderInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFolderSelected}
                    {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
                  />
                  <input
                    value={projectGitUrl}
                    onChange={(e) => setProjectGitUrl(e.target.value)}
                    placeholder="Git URL (optional)"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {projectError && <p className="text-xs text-red-500">{projectError}</p>}
                  <button
                    onClick={handleCreateProject}
                    className="w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90"
                  >
                    Crear proyecto
                  </button>
                </div>
              )}
              {projects.length > 0 && (
                <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                  {projects.slice(0, 5).map((project) => (
                    <div key={project.id} className="px-2 py-1.5 rounded-lg bg-secondary/40 text-xs truncate">
                      {project.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {t("integrations")}
              </h3>
              <a href="/drive" className="sidebar-item">
                <span className="text-sm">{t("googleDrive")}</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-secondary/70">
                  {oauthStatus?.google ? "OAuth" : "Sin OAuth"}
                </span>
              </a>

              <button
                type="button"
                onClick={() => setShowGithubPanel((prev) => !prev)}
                className="sidebar-item w-full text-left"
              >
                <span className="text-sm">{t("github")}</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-secondary/70">
                  {githubConnected ? "Conectado" : "Token"}
                </span>
              </button>

              {showGithubPanel && (
                <div className="mt-2 space-y-2 rounded-xl border border-border/60 bg-secondary/20 p-2.5">
                  <input
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="GitHub Personal Access Token"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/70 border border-border/50 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleGitHubTokenConnect}
                      className="flex-1 py-2 px-3 rounded-lg bg-primary text-primary-foreground text-xs hover:opacity-90"
                    >
                      Conectar token
                    </button>
                    <button
                      onClick={handleGitHubOAuthConnect}
                      className="py-2 px-3 rounded-lg bg-accent text-foreground text-xs hover:opacity-90"
                    >
                      OAuth
                    </button>
                  </div>
                  <button
                    onClick={loadGitHubRepos}
                    className="w-full py-2 px-3 rounded-lg bg-secondary/70 text-foreground text-xs hover:opacity-90"
                  >
                    {loadingRepos ? "Sincronizando repos..." : "Sincronizar repositorios"}
                  </button>
                  {githubError && <p className="text-xs text-red-500">{githubError}</p>}
                  {githubRepos.length > 0 && (
                    <div className="max-h-36 overflow-y-auto space-y-1 pt-1">
                      {githubRepos.slice(0, 20).map((repo) => (
                        <a
                          key={repo.id}
                          href={repo.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block px-2 py-1.5 rounded-lg hover:bg-accent text-xs"
                        >
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
      </aside>
    </>
  );
}

interface ChatItemProps {
  chat: { id: string; title: string; created_at: string };
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ChatItem({ chat, isActive, onSelect, onDelete }: ChatItemProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
        isActive ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
      }`}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <svg
        className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <span className="flex-1 truncate text-sm font-medium">{chat.title}</span>

      <div className={`flex items-center gap-1 transition-opacity ${showActions ? "opacity-100" : "opacity-0"}`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete chat"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

