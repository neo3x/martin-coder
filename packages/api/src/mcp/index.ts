import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

export interface MCPServerConfig {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  serverName: string
}

interface ServerInstance {
  config: MCPServerConfig
  client: Client
  transport: StdioClientTransport
  connected: boolean
  tools: MCPTool[]
}

export class MCPManager {
  private servers: Map<string, ServerInstance> = new Map()

  async addServer(
    name: string,
    command: string,
    args: string[],
    env?: Record<string, string>
  ): Promise<void> {
    if (this.servers.has(name)) {
      await this.removeServer(name)
    }

    const config: MCPServerConfig = { name, command, args, env }

    const transport = new StdioClientTransport({
      command,
      args,
      env: env ? { ...process.env, ...env } as Record<string, string> : undefined,
    })

    const client = new Client(
      {
        name: 'martin-coder',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    try {
      await client.connect(transport)

      const toolsResult = await client.listTools()
      const tools: MCPTool[] = toolsResult.tools.map((tool) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema as Record<string, unknown>,
        serverName: name,
      }))

      this.servers.set(name, {
        config,
        client,
        transport,
        connected: true,
        tools,
      })

      console.log(`[MCP] Connected to server: ${name} (${tools.length} tools)`)
    } catch (err) {
      throw new Error(`Failed to connect to MCP server ${name}: ${String(err)}`)
    }
  }

  async removeServer(name: string): Promise<void> {
    const server = this.servers.get(name)
    if (!server) return

    try {
      await server.client.close()
    } catch {
      // Ignore cleanup errors
    }

    this.servers.delete(name)
    console.log(`[MCP] Removed server: ${name}`)
  }

  async listTools(serverName?: string): Promise<MCPTool[]> {
    if (serverName) {
      const server = this.servers.get(serverName)
      if (!server) throw new Error(`MCP server not found: ${serverName}`)
      return server.tools
    }

    const allTools: MCPTool[] = []
    for (const server of this.servers.values()) {
      allTools.push(...server.tools)
    }
    return allTools
  }

  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const server = this.servers.get(serverName)
    if (!server) {
      throw new Error(`MCP server not found: ${serverName}`)
    }

    if (!server.connected) {
      throw new Error(`MCP server not connected: ${serverName}`)
    }

    try {
      console.log(`[MCP] Calling tool ${serverName}/${toolName}`)
      const result = await server.client.callTool({ name: toolName, arguments: args })
      return result
    } catch (err) {
      throw new Error(`Failed to call MCP tool ${serverName}/${toolName}: ${String(err)}`)
    }
  }

  listServers(): Array<{ name: string; command: string; connected: boolean; toolCount: number }> {
    return Array.from(this.servers.entries()).map(([name, server]) => ({
      name,
      command: server.config.command,
      connected: server.connected,
      toolCount: server.tools.length,
    }))
  }

  async refreshTools(serverName: string): Promise<void> {
    const server = this.servers.get(serverName)
    if (!server) throw new Error(`MCP server not found: ${serverName}`)

    const toolsResult = await server.client.listTools()
    server.tools = toolsResult.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema as Record<string, unknown>,
      serverName,
    }))
  }
}

export const mcpManager = new MCPManager()
