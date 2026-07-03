import { useState, useEffect } from 'react'
import { getSettings, updateSettings } from '../../shared/storage'
import { ENGINE_CONFIGS, type AppSettings, type TranslationEngine } from '../../shared/types'

const ENGINES = Object.values(ENGINE_CONFIGS)

export default function OptionsApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  const save = async (partial: Partial<AppSettings>) => {
    setSaving(true)
    setSaved(false)
    await updateSettings(partial)
    if (settings) {
      setSettings({ ...settings, ...partial })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!settings) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 40 }}>
        <p style={{ color: '#999' }}>加载中...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>双语对照翻译 - 设置</h1>

      {/* ===== 翻译引擎 ===== */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #eee' }}>翻译引擎</h2>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, fontWeight: 500, color: '#555', display: 'block', marginBottom: 8 }}>默认翻译引擎</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ENGINES.map((engine) => (
              <label
                key={engine.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: 12,
                  border: `1px solid ${settings.engine === engine.id ? '#4A90D9' : '#ddd'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: settings.engine === engine.id ? '#f0f7ff' : '#fff',
                  transition: 'border-color 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="engine"
                  checked={settings.engine === engine.id}
                  onChange={() => save({ engine: engine.id })}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{engine.name}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{engine.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => save({ enabled: e.target.checked })}
          />
          <span style={{ fontSize: 14 }}>启动翻译（默认开启）</span>
        </label>
      </section>

      {/* ===== API 密钥 ===== */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #eee' }}>API 密钥</h2>
        <p style={{ fontSize: 13, color: '#999', marginBottom: 16 }}>
          配置各翻译引擎的 API Key。只需配置你使用的引擎即可。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ENGINES.map((engine) => (
            <div key={engine.id} style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 500 }}>{engine.name}</label>
                  <p style={{ fontSize: 12, color: '#999', margin: '2px 0 0 0' }}>{engine.description}</p>
                </div>
                {engine.apiKeyUrl && (
                  <a
                    href={engine.apiKeyUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: '#4A90D9', textDecoration: 'none' }}
                  >
                    获取 Key ↗
                  </a>
                )}
              </div>
              <input
                type="password"
                value={settings[engine.apiKeyField as keyof AppSettings] as string || ''}
                onChange={(e) => save({ [engine.apiKeyField]: e.target.value } as Partial<AppSettings>)}
                placeholder={`输入 ${engine.name} API Key${engine.id === 'custom' ? '（不需要可留空）' : ''}...`}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {engine.id === 'custom' && (
                <div>
                  <input
                    type="url"
                    value={settings.customApiUrl || ''}
                    onChange={(e) => save({ customApiUrl: e.target.value } as Partial<AppSettings>)}
                    placeholder="API 地址 (如 http://localhost:3000/v1/chat/completions)"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      fontSize: 14,
                      outline: 'none',
                      marginTop: 8,
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="text"
                    value={settings.customModel || ''}
                    onChange={(e) => save({ customModel: e.target.value } as Partial<AppSettings>)}
                    placeholder="模型名称 (如 deepseek-chat, 留空则使用服务端默认)"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      fontSize: 14,
                      outline: 'none',
                      marginTop: 8,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, fontSize: 13 }}>
          {saving && <span style={{ color: '#999' }}>保存中...</span>}
          {saved && <span style={{ color: '#52c41a' }}>✅ 已保存</span>}
        </div>
      </section>

      {/* ===== 关于 ===== */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #eee' }}>关于</h2>
        <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, fontSize: 13, color: '#666' }}>
          <h3 style={{ fontWeight: 500, margin: '0 0 8px 0', color: '#333' }}>用法说明</h3>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>点击浏览器工具栏图标打开控制面板</li>
            <li>在控制面板中切换翻译引擎</li>
            <li>翻译引擎可在设置页面配置 API Key</li>
            <li>译文会以蓝色左边框标注，显示在原文段落下方</li>
          </ul>
        </div>

        <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, fontSize: 13, color: '#666', marginTop: 12 }}>
          <h3 style={{ fontWeight: 500, margin: '0 0 8px 0', color: '#333' }}>支持引擎</h3>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
            {ENGINES.map((e) => (
              <li key={e.id}>• {e.name} — {e.description}</li>
            ))}
          </ul>
        </div>

        <p style={{ fontSize: 12, color: '#ccc', marginTop: 16 }}>版本 1.0.0</p>
      </section>
    </div>
  )
}