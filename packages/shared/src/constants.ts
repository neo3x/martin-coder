import type { AIProvider, ModelInfo, ProviderInfo, AgentName, AgentDefinition } from './types.js'

// ─── Agent names ──────────────────────────────────────────────────────────────

export const AGENT_NAMES = ['build', 'plan'] as const

// ─── Provider & model defaults ───────────────────────────────────────────────

export const DEFAULT_PROVIDER: AIProvider = 'anthropic'
export const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'

// ─── Context compaction threshold ────────────────────────────────────────────

export const MAX_CONTEXT_RATIO = 0.90

// ─── Context windows per model ────────────────────────────────────────────────

export const CONTEXT_WINDOWS: Record<string, number> = {
  // Anthropic
  'claude-opus-4-6': 200_000,
  'claude-opus-4-5': 200_000,
  'claude-sonnet-4-6': 200_000,
  'claude-sonnet-4-5-20250929': 200_000,
  'claude-sonnet-4-5': 200_000,
  'claude-haiku-4-5': 200_000,
  'claude-3-5-sonnet-20241022': 200_000,
  'claude-3-5-haiku-20241022': 200_000,
  'claude-3-opus-20240229': 200_000,
  'claude-3-sonnet-20240229': 200_000,
  'claude-3-haiku-20240307': 200_000,

  // OpenAI
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-4-turbo': 128_000,
  'gpt-4': 8_192,
  'gpt-3.5-turbo': 16_385,
  'o1': 200_000,
  'o1-mini': 128_000,
  'o3-mini': 200_000,

  // Google
  'gemini-2.0-flash': 1_000_000,
  'gemini-2.0-flash-lite': 1_000_000,
  'gemini-1.5-pro': 2_000_000,
  'gemini-1.5-flash': 1_000_000,
  'gemini-1.5-flash-8b': 1_000_000,

  // Ollama (local, typically unlimited but using practical limits)
  'llama3.3': 128_000,
  'llama3.2': 128_000,
  'llama3.1': 128_000,
  'llama3': 8_192,
  'mistral': 32_768,
  'mixtral': 32_768,
  'codellama': 100_000,
  'deepseek-coder': 16_384,
  'qwen2.5-coder': 128_000,
  'phi4': 16_384,
  'gemma2': 8_192,
}

// ─── Model definitions ────────────────────────────────────────────────────────

export const MODELS: Record<string, ModelInfo> = {
  // ── Anthropic ──────────────────────────────────────────────────────────────
  'claude-opus-4-6': {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.075,
  },
  'claude-opus-4-5': {
    id: 'claude-opus-4-5',
    name: 'Claude Opus 4.5',
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.075,
  },
  'claude-sonnet-4-6': {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
  },
  'claude-sonnet-4-5-20250929': {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5 (2025-09-29)',
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
  },
  'claude-sonnet-4-5': {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
  },
  'claude-haiku-4-5': {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.00025,
    outputCostPer1k: 0.00125,
  },
  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
  },
  'claude-3-5-haiku-20241022': {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.0008,
    outputCostPer1k: 0.004,
  },
  'claude-3-opus-20240229': {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.075,
  },
  'claude-3-haiku-20240307': {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.00025,
    outputCostPer1k: 0.00125,
  },

  // ── OpenAI ─────────────────────────────────────────────────────────────────
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.0025,
    outputCostPer1k: 0.01,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.01,
    outputCostPer1k: 0.03,
  },
  'gpt-4': {
    id: 'gpt-4',
    name: 'GPT-4',
    contextWindow: 8_192,
    supportsTools: true,
    supportsVision: false,
    inputCostPer1k: 0.03,
    outputCostPer1k: 0.06,
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    contextWindow: 16_385,
    supportsTools: true,
    supportsVision: false,
    inputCostPer1k: 0.0005,
    outputCostPer1k: 0.0015,
  },
  'o1': {
    id: 'o1',
    name: 'O1',
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.06,
  },
  'o1-mini': {
    id: 'o1-mini',
    name: 'O1 Mini',
    contextWindow: 128_000,
    supportsTools: false,
    supportsVision: false,
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.012,
  },
  'o3-mini': {
    id: 'o3-mini',
    name: 'O3 Mini',
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: false,
    inputCostPer1k: 0.0011,
    outputCostPer1k: 0.0044,
  },

  // ── Google ─────────────────────────────────────────────────────────────────
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    contextWindow: 1_000_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.0001,
    outputCostPer1k: 0.0004,
  },
  'gemini-2.0-flash-lite': {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    contextWindow: 1_000_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.000075,
    outputCostPer1k: 0.0003,
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    contextWindow: 2_000_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.00125,
    outputCostPer1k: 0.005,
  },
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    contextWindow: 1_000_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.000075,
    outputCostPer1k: 0.0003,
  },
  'gemini-1.5-flash-8b': {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash 8B',
    contextWindow: 1_000_000,
    supportsTools: true,
    supportsVision: true,
    inputCostPer1k: 0.0000375,
    outputCostPer1k: 0.00015,
  },

  // ── Ollama (local, free) ───────────────────────────────────────────────────
  'llama3.3': {
    id: 'llama3.3',
    name: 'Llama 3.3',
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
  },
  'llama3.2': {
    id: 'llama3.2',
    name: 'Llama 3.2',
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
  },
  'llama3.1': {
    id: 'llama3.1',
    name: 'Llama 3.1',
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
  },
  'llama3': {
    id: 'llama3',
    name: 'Llama 3',
    contextWindow: 8_192,
    supportsTools: false,
    supportsVision: false,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
  },
  'mistral': {
    id: 'mistral',
    name: 'Mistral',
    contextWindow: 32_768,
    supportsTools: true,
    supportsVision: false,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
  },
  'mixtral': {
    id: 'mixtral',
    name: 'Mixtral',
    contextWindow: 32_768,
    supportsTools: true,
    supportsVision: false,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
  },
  'codellama': {
    id: 'codellama',
    name: 'Code Llama',
    contextWindow: 100_000,
    supportsTools: false,
    supportsVision: false,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
  },
  'deepseek-coder': {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    contextWindow: 16_384,
    supportsTools: false,
    supportsVision: false,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
  },
  'qwen2.5-coder': {
    id: 'qwen2.5-coder',
    name: 'Qwen 2.5 Coder',
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
  },
  'phi4': {
    id: 'phi4',
    name: 'Phi 4',
    contextWindow: 16_384,
    supportsTools: false,
    supportsVision: false,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
  },
  'gemma2': {
    id: 'gemma2',
    name: 'Gemma 2',
    contextWindow: 8_192,
    supportsTools: false,
    supportsVision: false,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
  },
}

// ─── Provider definitions ─────────────────────────────────────────────────────

export const PROVIDERS: Record<AIProvider, ProviderInfo> = {
  anthropic: {
    name: 'anthropic',
    displayName: 'Anthropic',
    isAvailable: true,
    requiresApiKey: true,
    models: [
      MODELS['claude-opus-4-6'],
      MODELS['claude-opus-4-5'],
      MODELS['claude-sonnet-4-6'],
      MODELS['claude-sonnet-4-5-20250929'],
      MODELS['claude-sonnet-4-5'],
      MODELS['claude-haiku-4-5'],
      MODELS['claude-3-5-sonnet-20241022'],
      MODELS['claude-3-5-haiku-20241022'],
      MODELS['claude-3-opus-20240229'],
      MODELS['claude-3-haiku-20240307'],
    ],
  },
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    isAvailable: true,
    requiresApiKey: true,
    models: [
      MODELS['gpt-4o'],
      MODELS['gpt-4o-mini'],
      MODELS['gpt-4-turbo'],
      MODELS['gpt-4'],
      MODELS['gpt-3.5-turbo'],
      MODELS['o1'],
      MODELS['o1-mini'],
      MODELS['o3-mini'],
    ],
  },
  google: {
    name: 'google',
    displayName: 'Google',
    isAvailable: true,
    requiresApiKey: true,
    models: [
      MODELS['gemini-2.0-flash'],
      MODELS['gemini-2.0-flash-lite'],
      MODELS['gemini-1.5-pro'],
      MODELS['gemini-1.5-flash'],
      MODELS['gemini-1.5-flash-8b'],
    ],
  },
  ollama: {
    name: 'ollama',
    displayName: 'Ollama (Local)',
    isAvailable: true,
    requiresApiKey: false,
    models: [
      MODELS['llama3.3'],
      MODELS['llama3.2'],
      MODELS['llama3.1'],
      MODELS['llama3'],
      MODELS['mistral'],
      MODELS['mixtral'],
      MODELS['codellama'],
      MODELS['deepseek-coder'],
      MODELS['qwen2.5-coder'],
      MODELS['phi4'],
      MODELS['gemma2'],
    ],
  },
}

// ─── Agent definitions ────────────────────────────────────────────────────────

export const AGENTS: Record<AgentName, AgentDefinition> = {
  build: {
    name: 'build',
    displayName: 'Build Agent',
    description: 'Full-featured coding agent with read/write access to files, terminal, and git',
    allowedTools: [
      'read_file',
      'write_file',
      'list_directory',
      'search_files',
      'execute_command',
      'git_status',
      'git_diff',
      'git_commit',
      'git_log',
      'create_directory',
      'delete_file',
      'move_file',
      'copy_file',
      'lsp_diagnostics',
      'lsp_completions',
      'lsp_hover',
      'web_search',
      'fetch_url',
    ],
    systemPrompt:
      'You are Martin, an expert software engineer and coding assistant. ' +
      'You have full access to the filesystem, terminal, and version control tools. ' +
      'You help users build, debug, and improve their code with precision and care. ' +
      'Always explain your reasoning before making changes and confirm destructive operations.',
    isReadOnly: false,
  },
  plan: {
    name: 'plan',
    displayName: 'Plan Agent',
    description: 'Read-only planning and analysis agent, no file modifications',
    allowedTools: [
      'read_file',
      'list_directory',
      'search_files',
      'git_status',
      'git_diff',
      'git_log',
      'lsp_diagnostics',
      'lsp_hover',
      'web_search',
      'fetch_url',
    ],
    systemPrompt:
      'You are Martin, a senior software architect and technical advisor. ' +
      'You operate in read-only mode: you can read files and analyze code but cannot modify anything. ' +
      'Your role is to help users plan, architect, and reason about their codebase. ' +
      'Provide detailed analysis, recommendations, and step-by-step plans.',
    isReadOnly: true,
  },
}
