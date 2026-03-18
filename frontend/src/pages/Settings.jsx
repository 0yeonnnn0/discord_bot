import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function Settings() {
  const [chance, setChance] = useState(8)
  const [prompt, setPrompt] = useState('')
  const [ragStats, setRagStats] = useState({ vectorCount: 0, indexCreated: false })
  const [testMsg, setTestMsg] = useState('')
  const [testReply, setTestReply] = useState('')
  const [testLoading, setTestLoading] = useState(false)

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => setChance(Math.round(d.replyChance * 100)))
    fetch('/api/prompt').then(r => r.json()).then(d => setPrompt(d.prompt))
    fetch('/api/rag-stats').then(r => r.json()).then(setRagStats)
  }, [])

  const saveChance = async () => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replyChance: chance / 100 }),
    })
    res.ok
      ? toast.success(`응답 확률 ${chance}%로 저장됨`)
      : toast.error('저장 실패')
  }

  const savePrompt = async () => {
    const res = await fetch('/api/prompt', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    res.ok
      ? toast.success('시스템 프롬프트 저장됨')
      : toast.error('프롬프트 저장 실패')
  }

  const resetPrompt = async () => {
    if (!confirm('기본 프롬프트로 복원하시겠습니까?')) return
    const res = await fetch('/api/prompt', { method: 'DELETE' })
    if (res.ok) {
      const data = await res.json()
      setPrompt(data.prompt)
      toast.success('기본 프롬프트로 복원됨')
    }
  }

  const sendTest = async () => {
    if (!testMsg.trim()) return
    setTestLoading(true)
    setTestReply('')
    try {
      const res = await fetch('/api/test-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testMsg }),
      })
      const data = await res.json()
      setTestReply(data.reply || data.error)
    } catch (err) {
      toast.error('응답 생성 실패: ' + err.message)
    }
    setTestLoading(false)
  }

  return (
    <div className="dashboard">
      <h1>설정</h1>

      {/* 응답 확률 */}
      <div className="section">
        <h2>자동 응답 확률</h2>
        <div className="settings-form">
          <div className="slider-wrap">
            <input type="range" min="0" max="100" value={chance}
              onChange={e => setChance(Number(e.target.value))} />
            <span id="chanceValue">{chance}%</span>
          </div>
          <button className="btn" onClick={saveChance}>저장</button>
        </div>
      </div>

      {/* RAG 현황 */}
      <div className="section">
        <h2>RAG 현황</h2>
        <div className="cards" style={{ maxWidth: 400 }}>
          <div className="card">
            <div className="card-label">저장된 벡터</div>
            <div className="card-value">{ragStats.vectorCount}개</div>
          </div>
          <div className="card">
            <div className="card-label">인덱스 상태</div>
            <div className={`card-value ${ragStats.indexCreated ? 'text-green' : 'text-red'}`}>
              {ragStats.indexCreated ? '활성' : '비활성'}
            </div>
          </div>
        </div>
        <p className="hint">대화 5개마다 자동으로 벡터가 저장됨</p>
      </div>

      {/* 시스템 프롬프트 */}
      <div className="section">
        <h2>시스템 프롬프트</h2>
        <textarea rows={20} value={prompt} onChange={e => setPrompt(e.target.value)} />
        <div className="btn-group">
          <button className="btn" onClick={savePrompt}>프롬프트 저장</button>
          <button className="btn btn-secondary" onClick={resetPrompt}>기본값 복원</button>
        </div>
        <p className="hint">저장 시 즉시 반영됨. 컨테이너 재시작하면 기본값으로 돌아감</p>
      </div>

      {/* 응답 테스트 */}
      <div className="section">
        <h2>응답 테스트</h2>
        <div className="test-area">
          <div className="test-input-wrap">
            <input
              type="text"
              value={testMsg}
              onChange={e => setTestMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendTest()}
              placeholder="테스트 메시지를 입력하세요"
            />
            <button className="btn" onClick={sendTest} disabled={testLoading}>전송</button>
          </div>
          {testLoading && <p className="hint">응답 생성 중...</p>}
          {testReply && (
            <div className="test-result">
              <div className="test-label">봇 응답:</div>
              <div>{testReply}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
