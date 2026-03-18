import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

const MODEL_OPTIONS = {
  google: [
    { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (Preview)' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ],
}

export default function Settings() {
  const [chance, setChance] = useState(8)
  const [provider, setProvider] = useState('google')
  const [model, setModel] = useState('')
  const [presets, setPresets] = useState([])
  const [activePresetId, setActivePresetId] = useState('')
  const [editingPreset, setEditingPreset] = useState(null)
  const [ragStats, setRagStats] = useState({ vectorCount: 0, indexCreated: false })
  const [messages, setMessages] = useState([])
  const [testMsg, setTestMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef(null)

  const fetchPresets = () => {
    fetch('/api/presets').then(r => r.json()).then(d => {
      setPresets(d.presets)
      setActivePresetId(d.activeId)
    })
  }

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => {
      setChance(Math.round(d.replyChance * 100))
      setProvider(d.aiProvider || 'google')
      setModel(d.model || '')
    })
    fetchPresets()
    fetch('/api/rag-stats').then(r => r.json()).then(setRagStats)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 프리셋 선택하면 프롬프트 로드
  const selectPreset = async (id) => {
    const res = await fetch(`/api/presets/${id}`)
    if (res.ok) {
      const data = await res.json()
      setEditingPreset(data)
    }
  }

  const activatePreset = async (id) => {
    const res = await fetch(`/api/presets/${id}/activate`, { method: 'PUT' })
    if (res.ok) {
      setActivePresetId(id)
      toast.success(`프리셋 "${presets.find(p => p.id === id)?.name}" 활성화`)
      fetchPresets()
    }
  }

  const savePreset = async () => {
    if (!editingPreset) return
    const res = await fetch(`/api/presets/${editingPreset.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingPreset),
    })
    if (res.ok) {
      toast.success('프리셋 저장 완료')
      fetchPresets()
    }
  }

  const createPreset = async () => {
    const name = prompt('새 프리셋 이름:')
    if (!name) return
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const res = await fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, description: '', prompt: '', ownerSuffix: '', userSuffix: '' }),
    })
    if (res.ok) {
      toast.success(`프리셋 "${name}" 생성`)
      fetchPresets()
      selectPreset(id)
    }
  }

  const deletePreset = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return
    const res = await fetch(`/api/presets/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('프리셋 삭제됨')
      setEditingPreset(null)
      fetchPresets()
    } else {
      const data = await res.json()
      toast.error(data.error)
    }
  }

  const saveChance = async () => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replyChance: chance / 100 }),
    })
    res.ok ? toast.success(`응답 확률 ${chance}%로 저장`) : toast.error('저장 실패')
  }

  const saveModel = async () => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiProvider: provider, model }),
    })
    res.ok ? toast.success(`모델 변경: ${model}`) : toast.error('저장 실패')
  }

  const sendTest = async () => {
    const msg = testMsg.trim()
    if (!msg || loading) return
    setTestMsg('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await fetch('/api/test-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'bot', content: data.reply || data.error }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Error: ' + err.message }])
    }
    setLoading(false)
  }

  const models = MODEL_OPTIONS[provider] || []

  return (
    <div className="stagger">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="page-desc">봇 설정을 변경하고 실시간으로 테스트합니다</p>
      </div>

      <div className="command-center">
        {/* Left Column */}
        <div className="stagger">
          {/* AI Model */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">AI Model</span>
              <button className="btn btn-primary" onClick={saveModel}>Save</button>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <select value={provider} onChange={e => {
                setProvider(e.target.value)
                setModel(MODEL_OPTIONS[e.target.value]?.[0]?.value || '')
              }} className="model-select">
                <option value="google">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
              <select value={model} onChange={e => setModel(e.target.value)}
                className="model-select" style={{ flex: 1 }}>
                {models.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          {/* Reply Chance */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Reply Chance</span>
              <button className="btn btn-primary" onClick={saveChance}>Save</button>
            </div>
            <div className="slider-row">
              <input type="range" min="0" max="100" value={chance}
                onChange={e => setChance(Number(e.target.value))} />
              <span className="slider-value">{chance}%</span>
            </div>
          </div>

          {/* RAG Memory */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">RAG Memory</span>
              <span className={`panel-badge ${ragStats.indexCreated ? 'green' : ''}`}>
                {ragStats.indexCreated ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="rag-stats">
              <div className="rag-stat-item">
                <div className="card-label">Stored Vectors</div>
                <div className="card-value mono text-accent">{ragStats.vectorCount}</div>
              </div>
              <div className="rag-stat-item">
                <div className="card-label">Chunk Size</div>
                <div className="card-value mono" style={{ color: 'var(--text-secondary)', fontSize: '0.93rem' }}>5 messages</div>
              </div>
            </div>
          </div>

          {/* Prompt Presets */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Prompt Presets</span>
              <button className="btn btn-ghost" onClick={createPreset}
                style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                + New
              </button>
            </div>

            <div className="preset-list">
              {presets.map(p => (
                <div
                  key={p.id}
                  className={`preset-item ${p.id === activePresetId ? 'active' : ''} ${editingPreset?.id === p.id ? 'editing' : ''}`}
                  onClick={() => selectPreset(p.id)}
                >
                  <div className="preset-info">
                    <span className="preset-name">{p.name}</span>
                    <span className="preset-desc">{p.description}</span>
                  </div>
                  <div className="preset-actions">
                    {p.id === activePresetId ? (
                      <span className="panel-badge green">Active</span>
                    ) : (
                      <button className="btn btn-ghost"
                        style={{ padding: '2px 10px', fontSize: '0.73rem' }}
                        onClick={(e) => { e.stopPropagation(); activatePreset(p.id); }}>
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prompt Editor */}
          {editingPreset && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">
                  Editing: {editingPreset.name}
                </span>
                {!['neko', 'mimic', 'chill'].includes(editingPreset.id) && (
                  <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '0.75rem', color: 'var(--red)' }}
                    onClick={() => deletePreset(editingPreset.id)}>
                    Delete
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <input type="text" value={editingPreset.name}
                  onChange={e => setEditingPreset({ ...editingPreset, name: e.target.value })}
                  placeholder="프리셋 이름" style={{ flex: 1 }} />
                <input type="text" value={editingPreset.description}
                  onChange={e => setEditingPreset({ ...editingPreset, description: e.target.value })}
                  placeholder="설명" style={{ flex: 2 }} />
              </div>

              <div className="card-label" style={{ marginBottom: 'var(--space-2)' }}>System Prompt</div>
              <textarea rows={14} value={editingPreset.prompt}
                onChange={e => setEditingPreset({ ...editingPreset, prompt: e.target.value })}
                spellCheck={false} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                <div>
                  <div className="card-label" style={{ marginBottom: 'var(--space-2)' }}>Owner Suffix</div>
                  <textarea rows={4} value={editingPreset.ownerSuffix || ''}
                    onChange={e => setEditingPreset({ ...editingPreset, ownerSuffix: e.target.value })}
                    style={{ minHeight: 'auto' }} spellCheck={false} />
                </div>
                <div>
                  <div className="card-label" style={{ marginBottom: 'var(--space-2)' }}>User Suffix</div>
                  <textarea rows={4} value={editingPreset.userSuffix || ''}
                    onChange={e => setEditingPreset({ ...editingPreset, userSuffix: e.target.value })}
                    style={{ minHeight: 'auto' }} spellCheck={false} />
                </div>
              </div>

              <div className="btn-group">
                <button className="btn btn-primary" onClick={savePreset}>Save Preset</button>
                <button className="btn btn-ghost" onClick={async () => {
                  await savePreset()
                  await activatePreset(editingPreset.id)
                }}>
                  Save & Activate
                </button>
              </div>
              <p className="form-hint">Owner Suffix: 주인에게만 추가되는 프롬프트. User Suffix: 일반 유저에게 추가.</p>
            </div>
          )}
        </div>

        {/* Right Column: Live Test */}
        <div className="test-panel">
          <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header">
              <span className="panel-title">Live Test</span>
              {messages.length > 0 && (
                <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                  onClick={() => setMessages([])}>Clear</button>
              )}
            </div>

            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="empty" style={{ padding: '3rem 0' }}>
                  <div className="empty-icon">=^0w0^=</div>
                  <div>메시지를 보내서 봇 응답을 테스트하세요</div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`chat-msg ${m.role}`}>{m.content}</div>
              ))}
              {loading && <div className="chat-msg bot loading">typing</div>}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input-row">
              <input type="text" value={testMsg}
                onChange={e => setTestMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendTest()}
                placeholder="메시지 입력..." disabled={loading} />
              <button className="btn btn-primary" onClick={sendTest}
                disabled={loading || !testMsg.trim()}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
