"use client";

import { useTranslations } from "next-intl";

export function DrivePanel() {
  const t = useTranslations("drive");
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-lg w-full rounded-2xl border border-border/60 bg-card/60 p-6 space-y-3">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">
          Google Drive integration is not available in this API build yet.
        </p>
        <p className="text-sm text-muted-foreground">
          Core features available now: authentication, projects, chat sessions, file APIs and AI providers.
        </p>
      </div>
    </div>
  );
}
