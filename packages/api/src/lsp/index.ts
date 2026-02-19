import { spawn, type ChildProcess } from 'child_process'
import {
  createConnection,
  InitializeRequest,
  DidOpenTextDocumentNotification,
  TextDocumentSyncKind,
  CompletionRequest,
  HoverRequest,
  DefinitionRequest,
  PublishDiagnosticsNotification,
} from 'vscode-languageserver-protocol'
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node.js'

export interface LSPServerConfig {
  command: string
  args: string[]
  language: string
}

export interface Diagnostic {
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  severity: number
  message: string
  source?: string
}

export interface CompletionItem {
  label: string
  kind?: number
  detail?: string
  documentation?: string
  insertText?: string
}

export interface HoverInfo {
  contents: string | string[]
  range?: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
}

export interface Location {
  uri: string
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
}

const LANGUAGE_SERVER_CONFIGS: Record<string, LSPServerConfig> = {
  typescript: {
    language: 'typescript',
    command: 'typescript-language-server',
    args: ['--stdio'],
  },
  javascript: {
    language: 'javascript',
    command: 'typescript-language-server',
    args: ['--stdio'],
  },
  python: {
    language: 'python',
    command: 'pyright-langserver',
    args: ['--stdio'],
  },
  rust: {
    language: 'rust',
    command: 'rust-analyzer',
    args: [],
  },
  go: {
    language: 'go',
    command: 'gopls',
    args: [],
  },
}

interface ServerInstance {
  process: ChildProcess
  connection: ReturnType<typeof createMessageConnection>
  language: string
  workspacePath: string
  initialized: boolean
  diagnostics: Map<string, Diagnostic[]>
}

export class LSPManager {
  private servers: Map<string, ServerInstance> = new Map()

  async startServer(language: string, workspacePath: string): Promise<void> {
    const config = LANGUAGE_SERVER_CONFIGS[language]
    if (!config) {
      throw new Error(`No LSP server configured for language: ${language}`)
    }

    // Stop existing server if running
    if (this.servers.has(language)) {
      await this.stopServer(language)
    }

    const key = `${language}:${workspacePath}`

    try {
      const serverProcess = spawn(config.command, config.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: workspacePath,
      })

      const reader = new StreamMessageReader(serverProcess.stdout!)
      const writer = new StreamMessageWriter(serverProcess.stdin!)
      const connection = createMessageConnection(reader, writer)

      const diagnosticsMap = new Map<string, Diagnostic[]>()

      connection.onNotification(PublishDiagnosticsNotification.type, (params) => {
        diagnosticsMap.set(params.uri, params.diagnostics as Diagnostic[])
      })

      connection.listen()

      // Initialize the LSP server
      await connection.sendRequest(InitializeRequest.type, {
        processId: process.pid,
        rootUri: `file://${workspacePath}`,
        capabilities: {
          textDocument: {
            synchronization: {
              didOpen: true,
              didChange: true,
              didClose: true,
            },
            completion: {
              completionItem: {
                documentationFormat: ['markdown', 'plaintext'],
              },
            },
            hover: {},
            definition: {},
            publishDiagnostics: {
              relatedInformation: true,
            },
          },
          workspace: {
            workspaceFolders: true,
          },
        },
        workspaceFolders: [
          {
            uri: `file://${workspacePath}`,
            name: workspacePath.split('/').pop() || 'workspace',
          },
        ],
      })

      serverProcess.on('error', (err) => {
        console.error(`[LSP] Server error for ${language}:`, err)
        this.servers.delete(key)
      })

      serverProcess.on('exit', (code) => {
        console.log(`[LSP] Server exited for ${language} with code ${code}`)
        this.servers.delete(key)
      })

      this.servers.set(key, {
        process: serverProcess,
        connection,
        language,
        workspacePath,
        initialized: true,
        diagnostics: diagnosticsMap,
      })

      console.log(`[LSP] Started ${language} server for ${workspacePath}`)
    } catch (err) {
      throw new Error(`Failed to start LSP server for ${language}: ${String(err)}`)
    }
  }

  async stopServer(language: string, workspacePath?: string): Promise<void> {
    // Find all servers for the language if no workspace specified
    const keysToStop: string[] = []

    for (const [key, server] of this.servers.entries()) {
      if (server.language === language && (!workspacePath || server.workspacePath === workspacePath)) {
        keysToStop.push(key)
      }
    }

    for (const key of keysToStop) {
      const server = this.servers.get(key)
      if (server) {
        try {
          server.connection.dispose()
          server.process.kill()
        } catch {
          // Ignore errors during cleanup
        }
        this.servers.delete(key)
        console.log(`[LSP] Stopped ${language} server`)
      }
    }
  }

  private getServer(language: string, workspacePath?: string): ServerInstance | undefined {
    for (const server of this.servers.values()) {
      if (server.language === language && (!workspacePath || server.workspacePath === workspacePath)) {
        return server
      }
    }
    return undefined
  }

  async getDiagnostics(
    language: string,
    filePath: string,
    content: string
  ): Promise<Diagnostic[]> {
    const server = this.getServer(language)

    if (!server || !server.initialized) {
      return []
    }

    const fileUri = `file://${filePath}`

    try {
      server.connection.sendNotification(DidOpenTextDocumentNotification.type, {
        textDocument: {
          uri: fileUri,
          languageId: language,
          version: 1,
          text: content,
        },
      })

      // Give the server time to process
      await new Promise((resolve) => setTimeout(resolve, 500))

      return server.diagnostics.get(fileUri) || []
    } catch (err) {
      console.error(`[LSP] Error getting diagnostics:`, err)
      return []
    }
  }

  async getCompletion(
    language: string,
    filePath: string,
    content: string,
    line: number,
    character: number
  ): Promise<CompletionItem[]> {
    const server = this.getServer(language)

    if (!server || !server.initialized) {
      return []
    }

    const fileUri = `file://${filePath}`

    try {
      server.connection.sendNotification(DidOpenTextDocumentNotification.type, {
        textDocument: {
          uri: fileUri,
          languageId: language,
          version: 1,
          text: content,
        },
      })

      const result = await server.connection.sendRequest(CompletionRequest.type, {
        textDocument: { uri: fileUri },
        position: { line, character },
      })

      if (!result) return []

      const items = Array.isArray(result) ? result : result.items || []
      return items.map((item) => ({
        label: item.label,
        kind: item.kind,
        detail: item.detail,
        documentation:
          typeof item.documentation === 'string'
            ? item.documentation
            : item.documentation?.value,
        insertText: item.insertText || item.label,
      }))
    } catch (err) {
      console.error(`[LSP] Error getting completions:`, err)
      return []
    }
  }

  async getHover(
    language: string,
    filePath: string,
    content: string,
    line: number,
    character: number
  ): Promise<HoverInfo | null> {
    const server = this.getServer(language)

    if (!server || !server.initialized) {
      return null
    }

    const fileUri = `file://${filePath}`

    try {
      server.connection.sendNotification(DidOpenTextDocumentNotification.type, {
        textDocument: {
          uri: fileUri,
          languageId: language,
          version: 1,
          text: content,
        },
      })

      const result = await server.connection.sendRequest(HoverRequest.type, {
        textDocument: { uri: fileUri },
        position: { line, character },
      })

      if (!result) return null

      const contents = typeof result.contents === 'string'
        ? result.contents
        : Array.isArray(result.contents)
          ? result.contents.map((c) => (typeof c === 'string' ? c : c.value))
          : (result.contents as { value: string }).value

      return { contents, range: result.range as HoverInfo['range'] }
    } catch (err) {
      console.error(`[LSP] Error getting hover:`, err)
      return null
    }
  }

  async getDefinition(
    language: string,
    filePath: string,
    content: string,
    line: number,
    character: number
  ): Promise<Location[]> {
    const server = this.getServer(language)

    if (!server || !server.initialized) {
      return []
    }

    const fileUri = `file://${filePath}`

    try {
      server.connection.sendNotification(DidOpenTextDocumentNotification.type, {
        textDocument: {
          uri: fileUri,
          languageId: language,
          version: 1,
          text: content,
        },
      })

      const result = await server.connection.sendRequest(DefinitionRequest.type, {
        textDocument: { uri: fileUri },
        position: { line, character },
      })

      if (!result) return []

      const locations = Array.isArray(result) ? result : [result]
      return locations.map((loc) => ({
        uri: (loc as Location).uri,
        range: (loc as Location).range,
      }))
    } catch (err) {
      console.error(`[LSP] Error getting definition:`, err)
      return []
    }
  }

  listServers(): Array<{ language: string; workspacePath: string; initialized: boolean }> {
    return Array.from(this.servers.values()).map((s) => ({
      language: s.language,
      workspacePath: s.workspacePath,
      initialized: s.initialized,
    }))
  }

  getSupportedLanguages(): string[] {
    return Object.keys(LANGUAGE_SERVER_CONFIGS)
  }
}

export const lspManager = new LSPManager()
