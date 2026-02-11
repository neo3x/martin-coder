"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";

interface DriveFile {
  id: string;
  name: string;
  mime_type: string;
  size?: number;
  modified_time?: string;
  web_view_link?: string;
  is_folder: boolean;
}

interface DriveStatus {
  configured: boolean;
  connected: boolean;
  user_has_token: boolean;
}

export function DrivePanel() {
  const t = useTranslations("drive");
  const tCommon = useTranslations("common");
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState("root");
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([
    { id: "root", name: t("myDrive") },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Check Drive status
  useEffect(() => {
    checkStatus();
  }, []);


  const checkStatus = async () => {
    try {
      const data = await api.request<DriveStatus>("/api/v1/drive/status");
      setStatus(data);
    } catch (err) {
      console.error("Failed to check Drive status:", err);
    }
  };

  const connectDrive = async () => {
    try {
      const data = await api.request<{ authorization_url: string }>(
        `/api/v1/drive/authorize?redirect_uri=${encodeURIComponent(
          window.location.href
        )}`
      );
      window.location.href = data.authorization_url;
    } catch (err) {
      setError("Failed to connect to Google Drive");
    }
  };

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.request<DriveFile[]>(
        `/api/v1/drive/files?folder_id=${currentFolder}`
      );
      setFiles(data);
    } catch (err: any) {
      setError(err.message || "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [currentFolder]);


  // Load files when folder changes
  useEffect(() => {
    if (status?.connected) {
      loadFiles();
    }
  }, [loadFiles, status?.connected]);

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolder(folderId);
    setFolderPath((prev) => [...prev, { id: folderId, name: folderName }]);
  };

  const navigateBack = (index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    setCurrentFolder(newPath[newPath.length - 1].id);
  };

  const searchFiles = async () => {
    if (!searchQuery.trim()) {
      loadFiles();
      return;
    }
    setLoading(true);
    try {
      const data = await api.request<DriveFile[]>(
        `/api/v1/drive/search?query=${encodeURIComponent(searchQuery)}`
      );
      setFiles(data);
    } catch (err: any) {
      setError(err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (file: DriveFile) => {
    try {
      window.open(`/api/v1/drive/files/${file.id}/download`, "_blank");
    } catch (err) {
      setError("Failed to download file");
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  // Not configured
  if (status && !status.configured) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold">{t("notConfigured")}</h3>
          <p className="text-muted-foreground text-sm">
            {t("notConfiguredDesc")}
          </p>
        </div>
      </div>
    );
  }

  // Not connected
  if (status && !status.connected) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10" viewBox="0 0 87.3 78" fill="none">
              <path
                d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H1.2c0 1.55.4 3.1 1.2 4.5l4.2 9.35z"
                fill="#0066DA"
              />
              <path
                d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 52.45c-.8 1.4-1.2 2.95-1.2 4.5h27.6L43.65 25z"
                fill="#00AC47"
              />
              <path
                d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.9l6.85 11.9 6.8 11.9z"
                fill="#EA4335"
              />
              <path
                d="M43.65 25L57.4 1.2c-1.35-.8-2.9-1.2-4.5-1.2H34.25c-1.6 0-3.15.45-4.5 1.2L43.65 25z"
                fill="#00832D"
              />
              <path
                d="M59.9 57H27.6L13.85 80.8c1.35.8 2.9 1.2 4.5 1.2h50.45c1.6 0 3.15-.45 4.5-1.2L59.9 57z"
                fill="#2684FC"
              />
              <path
                d="M73.4 26.55l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.25 28.15h26.4c0-1.55-.4-3.1-1.2-4.5l-11.7-22.1z"
                fill="#FFBA00"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold">{t("connect")}</h3>
          <p className="text-muted-foreground text-sm">
            {t("connectDesc")}
          </p>
          <button
            onClick={connectDrive}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.82 16.32H6.18L3.2 11.04h5.76L6.18 6h11.64l-2.78 5.04h5.76l-2.98 5.28z" />
            </svg>
            {t("connect")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 87.3 78" fill="none">
              <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H1.2c0 1.55.4 3.1 1.2 4.5l4.2 9.35z" fill="#0066DA"/>
              <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 52.45c-.8 1.4-1.2 2.95-1.2 4.5h27.6L43.65 25z" fill="#00AC47"/>
              <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.9l6.85 11.9 6.8 11.9z" fill="#EA4335"/>
              <path d="M43.65 25L57.4 1.2c-1.35-.8-2.9-1.2-4.5-1.2H34.25c-1.6 0-3.15.45-4.5 1.2L43.65 25z" fill="#00832D"/>
              <path d="M59.9 57H27.6L13.85 80.8c1.35.8 2.9 1.2 4.5 1.2h50.45c1.6 0 3.15-.45 4.5-1.2L59.9 57z" fill="#2684FC"/>
              <path d="M73.4 26.55l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.25 28.15h26.4c0-1.55-.4-3.1-1.2-4.5l-11.7-22.1z" fill="#FFBA00"/>
            </svg>
            {t("title")}
          </h2>
          <button
            onClick={loadFiles}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title={tCommon("refresh")}
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchFiles()}
            placeholder={t("searchFiles")}
            className="flex-1 px-3 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={searchFiles}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90"
          >
            {tCommon("search")}
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm overflow-x-auto">
          {folderPath.map((folder, index) => (
            <div key={folder.id} className="flex items-center">
              {index > 0 && (
                <span className="mx-1 text-muted-foreground">/</span>
              )}
              <button
                onClick={() => navigateBack(index)}
                className={`hover:text-primary ${
                  index === folderPath.length - 1
                    ? "font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {folder.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Files list */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {t("noFiles")}
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer group"
                onClick={() =>
                  file.is_folder
                    ? navigateToFolder(file.id, file.name)
                    : downloadFile(file)
                }
              >
                {/* Icon */}
                <div className="w-8 h-8 flex items-center justify-center">
                  {file.is_folder ? (
                    <svg
                      className="w-6 h-6 text-yellow-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="truncate">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(file.modified_time)}
                  </div>
                </div>

                {/* Size */}
                <div className="text-sm text-muted-foreground">
                  {formatSize(file.size)}
                </div>

                {/* Actions */}
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  {file.web_view_link && (
                    <a
                      href={file.web_view_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 hover:bg-background rounded"
                      title={t("openInDrive")}
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
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
