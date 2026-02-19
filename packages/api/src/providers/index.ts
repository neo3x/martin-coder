import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { LanguageModelV1 } from 'ai'

export interface ModelInfo {
  id: string
  name: string
  contextWindow: number
  inputCostPer1k: number
  outputCostPer1k: number
}

export interface ProviderInfo {
  name: string
  displayName: string
  models: ModelInfo[]
  requiresApiKey: boolean
}

const PROVIDER_MODELS: Record<string, ModelInfo[]> = {
  anthropic: [
    {
      id: 'claude-opus-4-6',
      name: 'Claude Opus 4.6',
      contextWindow: 200000,
      inputCostPer1k: 0.015,
      outputCostPer1k: 0.075,
    },
    {
      id: 'claude-sonnet-4-5-20250929',
      name: 'Claude Sonnet 4.5',
      contextWindow: 200000,
      inputCostPer1k: 0.003,
      outputCostPer1k: 0.015,
    },
    {
      id: 'claude-haiku-4-5-20251001',
      name: 'Claude Haiku 4.5',
      contextWindow: 200000,
      inputCostPer1k: 0.00025,
      outputCostPer1k: 0.00125,
    },
  ],
  openai: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      contextWindow: 128000,
      inputCostPer1k: 0.005,
      outputCostPer1k: 0.015,
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      contextWindow: 128000,
      inputCostPer1k: 0.01,
      outputCostPer1k: 0.03,
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      contextWindow: 16385,
      inputCostPer1k: 0.0005,
      outputCostPer1k: 0.0015,
    },
  ],
  google: [
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      contextWindow: 1048576,
      inputCostPer1k: 0.000075,
      outputCostPer1k: 0.0003,
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      contextWindow: 2097152,
      inputCostPer1k: 0.00125,
      outputCostPer1k: 0.005,
    },
  ],
  ollama: [
    {
      id: 'llama3.2',
      name: 'Llama 3.2',
      contextWindow: 128000,
      inputCostPer1k: 0,
      outputCostPer1k: 0,
    },
    {
      id: 'codellama',
      name: 'Code Llama',
      contextWindow: 100000,
      inputCostPer1k: 0,
      outputCostPer1k: 0,
    },
    {
      id: 'mistral',
      name: 'Mistral',
      contextWindow: 32768,
      inputCostPer1k: 0,
      outputCostPer1k: 0,
    },
  ],
}

export function getProvider(providerName: string, apiKey?: string): LanguageModelV1 {
  switch (providerName) {
    case 'anthropic': {
      const key = apiKey || process.env.ANTHROPIC_API_KEY
      if (!key) throw new Error('Anthropic API key is required')
      const anthropic = createAnthropic({ apiKey: key })
      return anthropic('claude-sonnet-4-5-20250929')
    }
    case 'openai': {
      const key = apiKey || process.env.OPENAI_API_KEY
      if (!key) throw new Error('OpenAI API key is required')
      const openai = createOpenAI({ apiKey: key })
      return openai('gpt-4o')
    }
    case 'google': {
      const key = apiKey || process.env.GOOGLE_API_KEY
      if (!key) throw new Error('Google API key is required')
      const google = createGoogleGenerativeAI({ apiKey: key })
      return google('gemini-2.0-flash')
    }
    case 'ollama': {
      const ollama = createOpenAI({
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
        apiKey: 'ollama',
      })
      return ollama('llama3.2')
    }
    default:
      throw new Error(`Unknown provider: ${providerName}`)
  }
}

export function getProviderModel(
  providerName: string,
  modelId: string,
  apiKey?: string
): LanguageModelV1 {
  switch (providerName) {
    case 'anthropic': {
      const key = apiKey || process.env.ANTHROPIC_API_KEY
      if (!key) throw new Error('Anthropic API key is required')
      const anthropic = createAnthropic({ apiKey: key })
      return anthropic(modelId as Parameters<typeof anthropic>[0])
    }
    case 'openai': {
      const key = apiKey || process.env.OPENAI_API_KEY
      if (!key) throw new Error('OpenAI API key is required')
      const openai = createOpenAI({ apiKey: key })
      return openai(modelId as Parameters<typeof openai>[0])
    }
    case 'google': {
      const key = apiKey || process.env.GOOGLE_API_KEY
      if (!key) throw new Error('Google API key is required')
      const google = createGoogleGenerativeAI({ apiKey: key })
      return google(modelId as Parameters<typeof google>[0])
    }
    case 'ollama': {
      const ollama = createOpenAI({
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
        apiKey: 'ollama',
      })
      return ollama(modelId as Parameters<typeof ollama>[0])
    }
    default:
      throw new Error(`Unknown provider: ${providerName}`)
  }
}

export function listProviders(): ProviderInfo[] {
  return [
    {
      name: 'anthropic',
      displayName: 'Anthropic Claude',
      models: PROVIDER_MODELS.anthropic,
      requiresApiKey: true,
    },
    {
      name: 'openai',
      displayName: 'OpenAI',
      models: PROVIDER_MODELS.openai,
      requiresApiKey: true,
    },
    {
      name: 'google',
      displayName: 'Google Gemini',
      models: PROVIDER_MODELS.google,
      requiresApiKey: true,
    },
    {
      name: 'ollama',
      displayName: 'Ollama (Local)',
      models: PROVIDER_MODELS.ollama,
      requiresApiKey: false,
    },
  ]
}

export function getModelsForProvider(providerName: string): ModelInfo[] {
  return PROVIDER_MODELS[providerName] || []
}

export function getModelInfo(providerName: string, modelId: string): ModelInfo | undefined {
  return PROVIDER_MODELS[providerName]?.find((m) => m.id === modelId)
}

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  let modelInfo: ModelInfo | undefined

  for (const models of Object.values(PROVIDER_MODELS)) {
    modelInfo = models.find((m) => m.id === model)
    if (modelInfo) break
  }

  if (!modelInfo) return 0

  const inputCost = (promptTokens / 1000) * modelInfo.inputCostPer1k
  const outputCost = (completionTokens / 1000) * modelInfo.outputCostPer1k

  return inputCost + outputCost
}

export function getContextLimit(model: string): number {
  for (const models of Object.values(PROVIDER_MODELS)) {
    const modelInfo = models.find((m) => m.id === model)
    if (modelInfo) return modelInfo.contextWindow
  }
  return 128000 // Default fallback
}
