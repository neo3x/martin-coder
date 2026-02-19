import { spawn, type ChildProcess } from 'child_process'

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

export interface LSPServerConfig {
  command: string
  args: string[]
  language: string
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

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

interface ServerInstance {
  process: ChildProcess
  language: string
  workspacePath: string
  initialized: boolean
  diagnostics: Map<string, Diagnostic[]>
  requestId: number
  pendingRequests: Map<number, PendingRequest>
  buffer: string
}

function buildLSPMessage(content: string): string {
  const contentBytes = Buffer.byteLength(content, 'utf-8')
  return `Content-Length: ${contentBytes}\r\n\r\n${content}`
}

function parseMessages(buffer: string): { messages: string[]; remaining: string } {
  const messages: string[] = []
  let remaining = buffer

  while (true) {
    const headerEnd = remaining.indexOf('\r\n\r\n')
    if (headerEnd === -1) break

    const header = remaining.slice(0, headerEnd)
    const lengthMatch = header.match(/Content-Length:\s*(\d+)/i)
    if (!lengthMatch) break

    const length = parseInt(lengthMatch[1], 10)
    const bodyStart = headerEnd + 4
    const bodyEnd = bodyStart + length

    if (remaining.length < bodyEnd) break

    messages.push(remaining.slice(bodyStart, bodyEnd))
    remaining = remaining.slice(bodyEnd)
  }

  return { messages, remaining }
}

export class LSPManager {
  private servers: Map<string, ServerInstance> = new Map()

  async startServer(language: string, workspacePath: string): Promise<void> {
    const config = LANGUAGE_SERVER_CONFIGS[language]
    if (!config) {
      throw new Error(`No LSP server configured for language: ${language}`)
    }

    const key = `${language}:${workspacePath}`

    // Stop existing server if running
    if (this.servers.has(key)) {
      await this.stopServer(language, workspacePath)
    }

    const serverProcess = spawn(config.command, config.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: workspacePath,
    })

    const instance: ServerInstance = {
      process: serverProcess,
      language,
      workspacePath,
      initialized: false,
      diagnostics: new Map(),
      requestId: 1,
      pendingRequests: new Map(),
      buffer: '',
    }

    serverProcess.stdout!.on('data', (data: Buffer) => {
      instance.buffer += data.toString('utf-8')
      const { messages, remaining } = parseMessages(instance.buffer)
      instance.buffer = remaining

      for (const msgStr of messages) {
        try {
          const msg = JSON.parse(msgStr) as {
            id?: number
            method?: string
            params?: unknown
            result?: unknown
            error?: unknown
          }

          if (msg.id !== undefined && instance.pendingRequests.has(msg.id)) {
            const pending = instance.pendingRequests.get(msg.id)!
            instance.pendingRequests.delete(msg.id)

            if (msg.error) {
              pending.reject(msg.error)
            } else {
              pending.resolve(msg.result)
            }
          } else if (msg.method === 'textDocument/publishDiagnostics') {
            const params = msg.params as { uri: string; diagnostics: Diagnostic[] }
            instance.diagnostics.set(params.uri, params.diagnostics)
          }
        } catch {
          // Ignore parse errors
        }
      }
    })

    serverProcess.stderr!.on('data', (data: Buffer) => {
      // Log LSP server stderr at debug level
      const text = data.toString()
      if (process.env.LSP_DEBUG) {
        console.debug(`[LSP:${language}] stderr:`, text.slice(0, 200))
      }
    })

    serverProcess.on('error', (err) => {
      console.error(`[LSP] Server error for ${language}:`, err)
      this.servers.delete(key)
    })

    serverProcess.on('exit', (code) => {
      console.log(`[LSP] Server exited for ${language} with code ${code}`)
      this.servers.delete(key)
    })

    this.servers.set(key, instance)

    // Send initialize request
    try {
      await this.sendRequest(instance, 'initialize', {
        processId: process.pid,
        rootUri: `file://${workspacePath}`,
        capabilities: {
          textDocument: {
            synchronization: {
              dynamicRegistration: false,
              willSave: false,
              didSave: false,
              willSaveWaitUntil: false,
            },
            completion: {
              dynamicRegistration: false,
              completionItem: {
                snippetSupport: false,
                documentationFormat: ['plaintext'],
              },
            },
            hover: {
              dynamicRegistration: false,
              contentFormat: ['plaintext'],
            },
            definition: { dynamicRegistration: false },
            publishDiagnostics: { relatedInformation: true },
          },
          workspace: { workspaceFolders: false },
        },
        workspaceFolders: null,
      })

      this.sendNotification(instance, 'initialized', {})
      instance.initialized = true

      console.log(`[LSP] Started ${language} server for ${workspacePath}`)
    } catch (err) {
      serverProcess.kill()
      this.servers.delete(key)
      throw new Error(`Failed to initialize LSP server for ${language}: ${String(err)}`)
    }
  }

  private sendRequest(
    instance: ServerInstance,
    method: string,
    params: unknown
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = instance.requestId++
      const message = JSON.stringify({ jsonrpc: '2.0', id, method, params })
      const lspMessage = buildLSPMessage(message)

      instance.pendingRequests.set(id, { resolve, reject })

      instance.process.stdin!.write(lspMessage)

      // Timeout after 10 seconds
      setTimeout(() => {
        if (instance.pendingRequests.has(id)) {
          instance.pendingRequests.delete(id)
          reject(new Error(`LSP request timeout: ${method}`))
        }
      }, 10000)
    })
  }

  private sendNotification(instance: ServerInstance, method: string, params: unknown): void {
    const message = JSON.stringify({ jsonrpc: '2.0', method, params })
    const lspMessage = buildLSPMessage(message)
    instance.process.stdin!.write(lspMessage)
  }

  private openDocument(instance: ServerInstance, fileUri: string, languageId: string, content: string): void {
    this.sendNotification(instance, 'textDocument/didOpen', {
      textDocument: {
        uri: fileUri,
        languageId,
        version: 1,
        text: content,
      },
    })
  }

  async stopServer(language: string, workspacePath?: string): Promise<void> {
    const keysToStop: string[] = []

    for (const [key, server] of this.servers.entries()) {
      if (
        server.language === language &&
        (!workspacePath || server.workspacePath === workspacePath)
      ) {
        keysToStop.push(key)
      }
    }

    for (const key of keysToStop) {
      const server = this.servers.get(key)
      if (server) {
        try {
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
      if (
        server.language === language &&
        (!workspacePath || server.workspacePath === workspacePath)
      ) {
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
    if (!server || !server.initialized) return []

    const fileUri = `file://${filePath}`

    try {
      this.openDocument(server, fileUri, language, content)
      // Wait for diagnostics to arrive
      await new Promise((resolve) => setTimeout(resolve, 800))
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
    if (!server || !server.initialized) return []

    const fileUri = `file://${filePath}`

    try {
      this.openDocument(server, fileUri, language, content)

      const result = (await this.sendRequest(server, 'textDocument/completion', {
        textDocument: { uri: fileUri },
        position: { line, character },
      })) as { items?: CompletionItem[] } | CompletionItem[] | null

      if (!result) return []

      const items = Array.isArray(result) ? result : (result as { items?: CompletionItem[] }).items || []
      return items.map((item) => ({
        label: item.label,
        kind: item.kind,
        detail: item.detail,
        documentation: typeof item.documentation === 'string' ? item.documentation : undefined,
        insertText: (item.insertText as string | undefined) || item.label,
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
    if (!server || !server.initialized) return null

    const fileUri = `file://${filePath}`

    try {
      this.openDocument(server, fileUri, language, content)

      const result = (await this.sendRequest(server, 'textDocument/hover', {
        textDocument: { uri: fileUri },
        position: { line, character },
      })) as {
        contents:
          | string
          | string[]
          | { kind: string; value: string }
          | Array<{ language: string; value: string }>
        range?: HoverInfo['range']
      } | null

      if (!result) return null

      const contentsRaw = result.contents
      let contentsStr: string | string[]

      if (typeof contentsRaw === 'string') {
        contentsStr = contentsRaw
      } else if (Array.isArray(contentsRaw)) {
        contentsStr = contentsRaw.map((c) =>
          typeof c === 'string' ? c : (c as { value: string }).value
        )
      } else if (contentsRaw && typeof contentsRaw === 'object' && 'value' in contentsRaw) {
        contentsStr = (contentsRaw as { value: string }).value
      } else {
        contentsStr = String(contentsRaw)
      }

      return { contents: contentsStr, range: result.range }
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
    if (!server || !server.initialized) return []

    const fileUri = `file://${filePath}`

    try {
      this.openDocument(server, fileUri, language, content)

      const result = (await this.sendRequest(server, 'textDocument/definition', {
        textDocument: { uri: fileUri },
        position: { line, character },
      })) as Location | Location[] | null

      if (!result) return []

      const locations = Array.isArray(result) ? result : [result]
      return locations.map((loc) => ({ uri: loc.uri, range: loc.range }))
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
