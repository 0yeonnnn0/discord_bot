import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

export default function Settings() {
  const [chance, setChance] = useState(8)
  const [prompt, setPrompt] = useState('')
  const [ragStats, setRagStats] = useState({ vectorCount: 0, indexCreated: false })
  const [messages, setMessages] = useState([])
  const [testMsg, setTestMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => setChance(Math.round(d.replyChance * 100)))
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
      toast.success('기본값 복원 완료')
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

  return (
    <div className="stagger">
      <div>
        <h1>Settings</h1>
        <p className="page-desc">봇 설정을 변경하고 실시간으로 테스트합니다</p>
      </div>

      <div className="command-center">
        {/* Left: Configuration */}
        <div className="stagger">
          {/* Reply Chance */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Reply Chance</span>
              <button className="btn btn-primary" onClick={saveChance} style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}>
                Save
              </button>
            </div>
            <div className="slider-row">
              <input type="range" min="0" max="100" value={chance}
                onChange={e => setChance(Number(e.target.value))} />
              <span className="slider-value">{chance}%</span>
            </div>
          </div>

          {/* RAG Status */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">RAG Memory</span>
              <span className="panel-badge">
                {ragStats.indexCreated ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <div className="card-label">Vectors</div>
                <div className="card-value mono">{ragStats.vectorCount}</div>
              </div>
              <div>
                <div className="card-label">Buffer</div>
                <div className="card-value mono" style={{ fontSize: '0.87rem', color: 'var(--text-secondary)' }}>5 msg / chunk</div>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">System Prompt</span>
            </div>
            <textarea
              rows={16}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              spellCheck={false}
            />
            <div className="btn-group">
              <button className="btn btn-primary" onClick={savePrompt}>Save Prompt</button>
              <button className="btn btn-ghost" onClick={resetPrompt}>Reset Default</button>
            </div>
            <p className="form-hint">변경 시 즉시 반영됩니다. 컨테이너 재시작 후에도 유지됩니다.</p>
          </div>
        </div>

        {/* Right: Live Test */}
        <div className="test-panel">
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="panel-header">
              <span className="panel-title">Live Test</span>
              {messages.length > 0 && (
                <button
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setMessages([])}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="empty" style={{ padding: '2rem 0' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem', opacity: 0.3 }}>{'=^0w0^='}</div>
                  <div>메시지를 보내서 봇을 테스트하세요</div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`chat-msg ${m.role}`}>
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="chat-msg bot loading">typing...</div>
              )}
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
