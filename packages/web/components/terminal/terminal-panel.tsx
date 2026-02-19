"use client";

import { useEffect, useRef } from "react";

interface TerminalPanelProps {
  onClose: () => void;
}

export function TerminalPanel({ onClose }: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<any>(null);

  useEffect(() => {
    // Dynamic import for xterm (client-side only)
    const initTerminal = async () => {
      if (!terminalRef.current || terminalInstance.current) return;

      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");
      const { WebLinksAddon } = await import("xterm-addon-web-links");

      // Import CSS
      await import("xterm/css/xterm.css");

      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: "#1a1b26",
          foreground: "#c0caf5",
          cursor: "#c0caf5",
          black: "#15161e",
          red: "#f7768e",
          green: "#9ece6a",
          yellow: "#e0af68",
          blue: "#7aa2f7",
          magenta: "#bb9af7",
          cyan: "#7dcfff",
          white: "#a9b1d6",
        },
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(new WebLinksAddon());

      terminal.open(terminalRef.current);
      fitAddon.fit();

      // Welcome message
      terminal.writeln("\x1b[1;34m  Martin-Coder Terminal\x1b[0m");
      terminal.writeln("  Type commands to execute in your project\n");
      terminal.write("$ ");

      // Handle input
      let command = "";
      terminal.onData((data) => {
        switch (data) {
          case "\r": // Enter
            terminal.writeln("");
            if (command.trim()) {
              // Here you would send the command to the backend
              terminal.writeln(`Executing: ${command}`);
              terminal.writeln("(Command execution not yet connected to backend)\n");
            }
            command = "";
            terminal.write("$ ");
            break;
          case "\u007F": // Backspace
            if (command.length > 0) {
              command = command.slice(0, -1);
              terminal.write("\b \b");
            }
            break;
          case "\u0003": // Ctrl+C
            command = "";
            terminal.writeln("^C");
            terminal.write("$ ");
            break;
          default:
            if (data >= String.fromCharCode(32)) {
              command += data;
              terminal.write(data);
            }
        }
      });

      // Handle resize
      const handleResize = () => fitAddon.fit();
      window.addEventListener("resize", handleResize);

      terminalInstance.current = { terminal, fitAddon };

      return () => {
        window.removeEventListener("resize", handleResize);
        terminal.dispose();
      };
    };

    initTerminal();
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#1a1b26]">
      {/* Header */}
      <div className="h-8 flex items-center justify-between px-4 bg-card border-b">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm">Terminal</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-accent rounded"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Terminal */}
      <div ref={terminalRef} className="flex-1" />
    </div>
  );
}
