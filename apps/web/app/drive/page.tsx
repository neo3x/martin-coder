"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DrivePanel } from "@/components/drive/drive-panel";

export default function DrivePage() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <DrivePanel />
        </main>
      </div>
    </div>
  );
}
