import type { TranslationEngine, TranslationRequest, TranslationResponse } from '../shared/types'
import { getApiKey, getSettings } from '../shared/storage'

interface QueueItem {
  request: TranslationRequest
  resolve: (response: TranslationResponse) => void
  reject: (error: Error) => void
}

const API_TIMEOUT = 30000 // 30s per request

class RequestQueue {
  private queue: QueueItem[] = []
  private maxConcurrent = 6
  private activeCount = 0

  enqueue(request: TranslationRequest): Promise<TranslationResponse> {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject })
      this.processNext()
    })
  }

  private processNext() {
    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const item = this.queue.shift()!
      this.activeCount++
      this.executeItem(item)
    }
  }

  private async executeItem(item: QueueItem) {
    try {
      const response = await translateWithEngine(item.request)
      item.resolve(response)
    } catch (error) {
      item.reject(error instanceof Error ? error : new Error(String(error)))
    } finally {
      this.activeCount--
      this.processNext()
    }
  }
}

export const requestQueue = new RequestQueue()

/** fetch with a timeout (AbortController). */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = API_TIMEOUT): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function translateWithEngine(request: TranslationRequest): Promise<TranslationResponse> {
  const { text, engine } = request

  if (!text || !text.trim()) {
    return { id: request.id, translatedText: '', engine, success: true }
  }

  switch (engine) {
    case 'deepseek':
      return translateDeepSeek(request)
    case 'claude':
      return translateClaude(request)
    case 'azure':
      return translateAzure(request)
    case 'baidu':
      return translateBaidu(request)
    case 'custom':
      return translateCustom(request)
    default:
      return { id: request.id, translatedText: '', engine, success: false, error: `Unknown engine: ${engine}` }
  }
}

async function translateDeepSeek(request: TranslationRequest): Promise<TranslationResponse> {
  const apiKey = await getApiKey('deepseek')
  if (!apiKey) {
    return { id: request.id, translatedText: '', engine: 'deepseek', success: false, error: '请先配置 DeepSeek API Key' }
  }

  const response = await fetchWithTimeout('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Translate the following English text to Chinese (Simplified). Output ONLY the translation, no explanations, no notes. Preserve the original meaning and tone. Keep technical terms in their standard translation.',
        },
        {
          role: 'user',
          content: request.text,
        },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    return { id: request.id, translatedText: '', engine: 'deepseek', success: false, error: `API Error: ${response.status} - ${error}` }
  }

  const data = await response.json()
  const translatedText = data.choices?.[0]?.message?.content?.trim() || ''
  return { id: request.id, translatedText, engine: 'deepseek', success: true }
}

async function translateClaude(request: TranslationRequest): Promise<TranslationResponse> {
  const apiKey = await getApiKey('claude')
  if (!apiKey) {
    return { id: request.id, translatedText: '', engine: 'claude', success: false, error: '请先配置 Claude API Key' }
  }

  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: 'You are a professional translator. Translate the following English text to Chinese (Simplified). Output ONLY the translation, no explanations, no notes. Preserve the original meaning and tone.',
      messages: [
        { role: 'user', content: request.text },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    return { id: request.id, translatedText: '', engine: 'claude', success: false, error: `API Error: ${response.status} - ${error}` }
  }

  const data = await response.json()
  const translatedText = data.content?.[0]?.text?.trim() || ''
  return { id: request.id, translatedText, engine: 'claude', success: true }
}

async function translateAzure(request: TranslationRequest): Promise<TranslationResponse> {
  const apiKey = await getApiKey('azure')
  if (!apiKey) {
    return { id: request.id, translatedText: '', engine: 'azure', success: false, error: '请先配置 Azure Translator API Key' }
  }

  const response = await fetchWithTimeout(
    `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=zh-Hans`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
      },
      body: JSON.stringify([{ text: request.text }]),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    return { id: request.id, translatedText: '', engine: 'azure', success: false, error: `API Error: ${response.status} - ${error}` }
  }

  const data = await response.json()
  const translatedText = data[0]?.translations?.[0]?.text || ''
  return { id: request.id, translatedText, engine: 'azure', success: true }
}

async function translateBaidu(request: TranslationRequest): Promise<TranslationResponse> {
  const apiKey = await getApiKey('baidu')
  if (!apiKey) {
    return { id: request.id, translatedText: '', engine: 'baidu', success: false, error: '请先配置百度翻译 API Key' }
  }

  const appid = apiKey.split(':')[0] || apiKey
  const secretKey = apiKey.split(':')[1] || apiKey
  const salt = Date.now()
  const signRaw = appid + request.text + salt + secretKey
  const sign = await md5(signRaw)

  const params = new URLSearchParams({
    q: request.text,
    from: 'en',
    to: 'zh',
    appid,
    salt: String(salt),
    sign,
  })

  const response = await fetchWithTimeout(`https://fanyi-api.baidu.com/api/trans/vip/translate?${params}`)

  if (!response.ok) {
    const error = await response.text()
    return { id: request.id, translatedText: '', engine: 'baidu', success: false, error: `API Error: ${response.status} - ${error}` }
  }

  const data = await response.json()
  if (data.error_code) {
    return { id: request.id, translatedText: '', engine: 'baidu', success: false, error: `百度翻译 Error: ${data.error_code} - ${data.error_msg || ''}` }
  }

  const translatedText = data.trans_result?.map((r: { dst: string }) => r.dst).join('\n') || ''
  return { id: request.id, translatedText, engine: 'baidu', success: true }
}

async function md5(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('MD5', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function translateCustom(request: TranslationRequest): Promise<TranslationResponse> {
  const settings = await getSettings()
  const apiKey = settings.customApiKey
  const apiUrl = settings.customApiUrl
  const model = settings.customModel || ''

  if (!apiUrl) {
    return { id: request.id, translatedText: '', engine: 'custom', success: false, error: '请先配置自定义 API 地址' }
  }

  try {
    const bodyObj: Record<string, unknown> = {
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Translate the following English text to Chinese (Simplified). Output ONLY the translation, no explanations.',
        },
        {
          role: 'user',
          content: request.text,
        },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    }

    if (model) {
      bodyObj.model = model
    }

    const response = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(bodyObj),
    })

    const contentType = response.headers.get('content-type') || ''

    if (!response.ok) {
      const error = await response.text()
      return { id: request.id, translatedText: '', engine: 'custom', success: false, error: `API 错误 (${response.status}): ${error.slice(0, 200)}` }
    }

    if (!contentType.includes('application/json') && !contentType.includes('text/event-stream')) {
      const body = await response.text()
      return { id: request.id, translatedText: '', engine: 'custom', success: false, error: `API 返回了非 JSON 数据 (${contentType || 'unknown'})，请检查 API 地址是否正确` }
    }

    const data = await response.json()
    const translatedText = data.choices?.[0]?.message?.content?.trim()
      || data.response?.trim()
      || ''
    return { id: request.id, translatedText, engine: 'custom', success: true }
  } catch (error) {
    return { id: request.id, translatedText: '', engine: 'custom', success: false, error: `请求失败: ${error instanceof Error ? error.message : String(error)}` }
  }
}