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
  const [prompt, setPrompt] = useState('')
  const [ragStats, setRagStats] = useState({ vectorCount: 0, indexCreated: false })
  const [messages, setMessages] = useState([])
  const [testMsg, setTestMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => {
      setChance(Math.round(d.replyChance * 100))
      setProvider(d.aiProvider || 'google')
      setModel(d.model || '')
    })
    fetch('/api/prompt').then(r => r.json()).then(d => setPrompt(d.prompt))
    fetch('/api/rag-stats').then(r => r.json()).then(setRagStats)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const savePrompt = async () => {
    const res = await fetch('/api/prompt', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    res.ok ? toast.success('프롬프트 저장 완료') : toast.error('저장 실패')
  }

  const resetPrompt = async () => {
    if (!confirm('기본 프롬프트로 복원하시겠습니까?')) return
    const res = await fetch('/api/prompt', { method: 'DELETE' })
    if (res.ok) {
      const data = await res.json()
      setPrompt(data.prompt)
      toast.success('기본값 복원')
    }
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
              <select
                value={provider}
                onChange={e => {
                  setProvider(e.target.value)
                  setModel(MODEL_OPTIONS[e.target.value]?.[0]?.value || '')
                }}
                className="model-select"
              >
                <option value="google">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                className="model-select"
                style={{ flex: 1 }}
              >
                {models.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <p className="form-hint">변경 즉시 반영. 재시작 후에도 유지됩니다.</p>
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

          {/* System Prompt */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">System Prompt</span>
            </div>
            <textarea
              rows={18}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              spellCheck={false}
            />
            <div className="btn-group">
              <button className="btn btn-primary" onClick={savePrompt}>Save Prompt</button>
              <button className="btn btn-ghost" onClick={resetPrompt}>Reset Default</button>
            </div>
            <p className="form-hint">변경 시 즉시 반영. 컨테이너 재시작 후에도 유지됩니다.</p>
          </div>
        </div>

        {/* Right Column: Live Test */}
        <div className="test-panel">
          <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header">
              <span className="panel-title">Live Test</span>
              {messages.length > 0 && (
                <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                  onClick={() => setMessages([])}>
                  Clear
                </button>
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
              <input
                type="text"
                value={testMsg}
                onChange={e => setTestMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendTest()}
                placeholder="메시지 입력..."
                disabled={loading}
              />
              <button className="btn btn-primary" onClick={sendTest} disabled={loading || !testMsg.trim()}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
