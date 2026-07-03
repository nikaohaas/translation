export type TranslationEngine = 'deepseek' | 'claude' | 'azure' | 'baidu' | 'custom'

export type DisplayMode = 'paragraph_below'

export type TranslationDirection = 'en2zh'

export interface TranslationRequest {
  id: string
  text: string
  sourceLang: string
  targetLang: string
  engine: TranslationEngine
}

export interface TranslationResponse {
  id: string
  translatedText: string
  engine: TranslationEngine
  success: boolean
  error?: string
}

export interface TranslationCacheEntry {
  text: string
  translatedText: string
  engine: TranslationEngine
  timestamp: number
}

export interface EngineConfig {
  id: TranslationEngine
  name: string
  description: string
  requiresApiKey: boolean
  apiKeyField: string
  apiKeyUrl: string
  isBuiltIn?: boolean
}

export const ENGINE_CONFIGS: Record<TranslationEngine, EngineConfig> = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek V4 Flash',
    description: '性价比高，中英翻译质量好',
    requiresApiKey: true,
    apiKeyField: 'deepseekApiKey',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
  },
  claude: {
    id: 'claude',
    name: 'Claude API',
    description: '翻译质量最高，支持上下文理解',
    requiresApiKey: true,
    apiKeyField: 'claudeApiKey',
    apiKeyUrl: 'https://console.anthropic.com/',
  },
  azure: {
    id: 'azure',
    name: 'Azure Translator',
    description: 'Microsoft 翻译服务，免费额度大',
    requiresApiKey: true,
    apiKeyField: 'azureApiKey',
    apiKeyUrl: 'https://portal.azure.com/',
  },
  baidu: {
    id: 'baidu',
    name: '百度翻译',
    description: '国内访问快，中文优化好',
    requiresApiKey: true,
    apiKeyField: 'baiduApiKey',
    apiKeyUrl: 'https://fanyi-api.baidu.com/',
  },
  custom: {
    id: 'custom',
    name: '自定义 API',
    description: '使用自建的翻译服务端点',
    requiresApiKey: true,
    apiKeyField: 'customApiKey',
    apiKeyUrl: '',
  },
}

export interface AppSettings {
  engine: TranslationEngine
  displayMode: DisplayMode
  direction: TranslationDirection
  enabled: boolean
  deepseekApiKey: string
  claudeApiKey: string
  azureApiKey: string
  baiduApiKey: string
  customApiKey: string
  customApiUrl: string
  customModel: string
  excludedSites: string[]
}

export const DEFAULT_SETTINGS: AppSettings = {
  engine: 'deepseek',
  displayMode: 'paragraph_below',
  direction: 'en2zh',
  enabled: false,
  deepseekApiKey: '',
  claudeApiKey: '',
  azureApiKey: '',
  baiduApiKey: '',
  customApiKey: '',
  customApiUrl: '',
  customModel: '',
  excludedSites: [],
}