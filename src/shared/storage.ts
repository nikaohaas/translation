import type { AppSettings } from './types'
import { DEFAULT_SETTINGS } from './types'

export async function getSettings(): Promise<AppSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      resolve(items as AppSettings)
    })
  })
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set(partial, () => {
      resolve()
    })
  })
}

export async function getApiKey(engine: string): Promise<string> {
  const settings = await getSettings()
  const keyMap: Record<string, keyof AppSettings> = {
    deepseek: 'deepseekApiKey',
    claude: 'claudeApiKey',
    azure: 'azureApiKey',
    baidu: 'baiduApiKey',
    custom: 'customApiKey',
  }
  const key = keyMap[engine]
  return key ? (settings[key] as string) || '' : ''
}