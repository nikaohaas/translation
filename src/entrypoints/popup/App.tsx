import { useState, useEffect } from 'react'
import { getSettings, updateSettings } from '../../shared/storage'
import { ENGINE_CONFIGS, type TranslationEngine } from '../../shared/types'

const ENGINES = Object.values(ENGINE_CONFIGS)

const styles = {
  container: {
    width: 320,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    color: '#1a1a2e',
    background: '#fff',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid #f0f0f0',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 22,
    height: 22,
    background: 'linear-gradient(135deg, #6366f1, #4F46E5)',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1a1a2e',
  },
  section: {
    padding: '12px 16px',
    borderBottom: '1px solid #f5f5f5',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#999',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 8,
  },
  engineBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e8e8e8',
    borderRadius: 8,
    background: '#fafafa',
    cursor: 'pointer',
    fontSize: 13,
    color: '#333',
    transition: 'all 0.15s',
    boxSizing: 'border-box' as const,
  },
  engineDropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    background: '#fff',
    border: '1px solid #e8e8e8',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    zIndex: 100,
    overflow: 'hidden',
  },
  engineOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 12px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: 13,
    textAlign: 'left' as const,
    transition: 'background 0.1s',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #f5f5f5',
  },
  statusLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dot: (active: boolean) => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    background: active ? '#52c41a' : '#d0d0d0',
    transition: 'background 0.3s',
  }),
  statusText: (active: boolean) => ({
    fontSize: 13,
    color: active ? '#333' : '#999',
  }),
  footer: {
    display: 'flex',
    gap: 8,
    padding: '10px 16px',
  },
  btn: (variant: 'primary' | 'ghost') => ({
    flex: 1,
    padding: '8px 0',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: variant === 'primary' ? '#4A90D9' : '#f5f5f5',
    color: variant === 'primary' ? '#fff' : '#666',
  }),
  translatedBadge: {
    padding: '2px 8px',
    background: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 500,
  },
}

const ENGINE_ICONS: Record<string, string> = {
  deepseek: '🧠',
  claude: '🤖',
  azure: '☁️',
  baidu: '🌐',
  custom: '🔧',
}

export default function PopupApp() {
  const [currentEngine, setCurrentEngine] = useState<TranslationEngine>('deepseek')
  const [loading, setLoading] = useState(true)
  const [showEngineMenu, setShowEngineMenu] = useState(false)
  const [translated, setTranslated] = useState(false) // session-only state

  useEffect(() => {
    getSettings().then((settings) => {
      setCurrentEngine(settings.engine)
      setLoading(false)
    })
  }, [])

  const translatePage = async () => {
    setTranslated(true)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_TRANSLATION', payload: { enabled: true } })
        .catch(() => {})
    }
  }

  const stopTranslate = async () => {
    setTranslated(false)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_TRANSLATION', payload: { enabled: false } })
        .catch(() => {})
    }
  }

  const selectEngine = async (engine: TranslationEngine) => {
    setCurrentEngine(engine)
    setShowEngineMenu(false)
    setTranslated(false)
    await updateSettings({ engine })
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      chrome.tabs.reload(tab.id)
    }
  }

  const openOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
          <span style={{ color: '#999', fontSize: 13 }}>加载中...</span>
        </div>
      </div>
    )
  }

  const currentConfig = ENGINE_CONFIGS[currentEngine]
  const engineIcon = ENGINE_ICONS[currentEngine] || '🌐'

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>A中</div>
          <span style={styles.title}>双语对照翻译</span>
        </div>
        {translated && <span style={styles.translatedBadge}>已翻译 ✓</span>}
      </div>

      {/* Engine Selector */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>翻译引擎</div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowEngineMenu(!showEngineMenu)}
            style={styles.engineBtn}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{engineIcon}</span>
              <span style={{ fontWeight: 500 }}>{currentConfig.name}</span>
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
              <path d={showEngineMenu ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
            </svg>
          </button>

          {showEngineMenu && (
            <div style={styles.engineDropdown}>
              {ENGINES.map((engine, i) => (
                <button
                  key={engine.id}
                  onClick={() => selectEngine(engine.id)}
                  style={{
                    ...styles.engineOption,
                    background: currentEngine === engine.id ? '#f0f7ff' : 'transparent',
                    borderBottom: i < ENGINES.length - 1 ? '1px solid #f5f5f5' : 'none',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{ENGINE_ICONS[engine.id] || '🌐'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: currentEngine === engine.id ? 600 : 400 }}>
                      {engine.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>{engine.description}</div>
                  </div>
                  {currentEngine === engine.id && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A90D9" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      <div style={styles.statusRow}>
        <div style={styles.statusLeft}>
          <div style={styles.dot(translated)} />
          <span style={styles.statusText(translated)}>
            {translated ? '此页面已翻译' : '点击下方按钮翻译此页面'}
          </span>
        </div>
        <span style={{ fontSize: 11, color: '#bbb' }}>
          {currentConfig.name}
        </span>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        {translated ? (
          <button onClick={stopTranslate} style={{ ...styles.btn('ghost') }}>
            移除翻译
          </button>
        ) : (
          <button onClick={translatePage} style={styles.btn('primary')}>
            翻译此页面
          </button>
        )}
        <button onClick={openOptions} style={styles.btn('ghost')}>
          ⚙️ 设置
        </button>
      </div>
    </div>
  )
}