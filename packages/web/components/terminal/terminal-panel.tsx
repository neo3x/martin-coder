"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useProjectStore } from "@/lib/stores/project-store";

interface TerminalPanelProps {
  onClose: () => void;
}

interface ExecResponse {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function TerminalPanel({ onClose }: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<any>(null);
  const commandBuffer = useRef("");
  const { selectedProject } = useProjectStore();

  useEffect(() => {
    const initTerminal = async () => {
      if (!terminalRef.current || terminalInstance.current) return;

      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");
      const { WebLinksAddon } = await import("xterm-addon-web-links");
      await import("xterm/css/xterm.css");

      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: "#111827",
          foreground: "#d1d5db",
          cursor: "#f9fafb",
        },
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(new WebLinksAddon());
      terminal.open(terminalRef.current);
      fitAddon.fit();

      const cwd = selectedProject?.localPath || "/workspace";
      terminal.writeln("\x1b[1;36mMartin-Coder Terminal\x1b[0m");
      terminal.writeln(`cwd: ${cwd}`);
      terminal.writeln("Type commands and press Enter.\n");

      const prompt = () => terminal.write("\x1b[32m$\x1b[0m ");
      prompt();

      const runCommand = async (command: string) => {
        if (!command.trim()) {
          prompt();
          return;
        }

        if (command.trim() === "clear") {
          terminal.clear();
          prompt();
          return;
        }

        try {
          const result = await api.post<ExecResponse>("/files/exec", {
            command,
            cwd,
            timeoutMs: 30000,
          });

          if (result.stdout) {
            terminal.write(result.stdout.replace(/\n/g, "\r\n"));
            if (!result.stdout.endsWith("\n")) terminal.write("\r\n");
          }
          if (result.stderr) {
            terminal.write(`\x1b[31m${result.stderr.replace(/\n/g, "\r\n")}\x1b[0m`);
            if (!result.stderr.endsWith("\n")) terminal.write("\r\n");
          }

          if (!result.ok) {
            terminal.writeln(`\x1b[31mexit code: ${result.exitCode}\x1b[0m`);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Command failed";
          terminal.writeln(`\x1b[31m${message}\x1b[0m`);
        }

        prompt();
      };

      terminal.onData((data) => {
        switch (data) {
          case "\r":
            terminal.writeln("");
            {
              const cmd = commandBuffer.current;
              commandBuffer.current = "";
              void runCommand(cmd);
            }
            break;
          case "\u007F":
            if (commandBuffer.current.length > 0) {
              commandBuffer.current = commandBuffer.current.slice(0, -1);
              terminal.write("\b \b");
            }
            break;
          case "\u0003":
            commandBuffer.current = "";
            terminal.writeln("^C");
            prompt();
            break;
          default:
            if (data >= String.fromCharCode(32)) {
              commandBuffer.current += data;
              terminal.write(data);
            }
        }
      });

      const handleResize = () => fitAddon.fit();
      window.addEventListener("resize", handleResize);
      terminalInstance.current = { terminal, fitAddon, handleResize };
    };

    void initTerminal();

    return () => {
      const inst = terminalInstance.current;
      if (inst?.handleResize) {
        window.removeEventListener("resize", inst.handleResize);
      }
      if (inst?.terminal) {
        inst.terminal.dispose();
      }
      terminalInstance.current = null;
    };
  }, [selectedProject?.localPath]);

  return (
    <div className="h-full flex flex-col bg-[#111827]">
      <div className="h-8 flex items-center justify-between px-4 bg-card border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm">Terminal</span>
          <span className="text-xs text-muted-foreground truncate max-w-[280px]">
            {selectedProject?.localPath || "/workspace"}
          </span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-accent rounded">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div ref={terminalRef} className="flex-1" />
    </div>
  );
}

