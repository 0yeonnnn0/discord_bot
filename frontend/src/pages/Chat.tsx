import { useState, useEffect, useRef } from 'react'
import { newRandomNick } from 'random-korean-nickname'

interface Character {
  id: string
  name: string
  description: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function getSessionId(): string {
  let sid = sessionStorage.getItem('chat-session')
  if (!sid) {
    sid = `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem('chat-session', sid)
  }
  return sid
}

export default function Chat() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selected, setSelected] = useState<Character | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [nickname, setNickname] = useState(() => newRandomNick())
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/chat/characters')
      .then(r => r.json())
      .then(setCharacters)
      .catch(() => {})
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (selected) inputRef.current?.focus()
  }, [selected])

  const sendMessage = async () => {
    if (!input.trim() || !selected || loading) return
    const userMsg = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user' as const, content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: selected.id,
          message: userMsg,
          sessionId: getSessionId(),
          nickname,
          history: newMessages.slice(-10),
        }),
      })
      const data = await res.json()
      if (data.reply) {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }])
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: '앗.. 오류가 났어. 다시 해줘!' }])
    }
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const goBack = () => {
    setSelected(null)
    setMessages([])
  }

  const openNicknameEdit = () => {
    setNicknameInput(nickname)
    setEditingNickname(true)
  }

  const saveNickname = () => {
    const trimmed = nicknameInput.trim()
    if (trimmed) setNickname(trimmed)
    setEditingNickname(false)
  }

  // Character select screen
  if (!selected) {
    return (
      <div className="kt-page">
        <div className="kt-container">
          <div className="kt-header">
            <span className="kt-header-title">채팅</span>
          </div>
          <div className="kt-friend-list">
            {/* My profile */}
            <div className="kt-section-label">내 프로필</div>
            <button className="kt-friend-row" onClick={openNicknameEdit}>
              <div className="kt-profile-pic me">
                {nickname[0]}
              </div>
              <div className="kt-friend-info">
                <div className="kt-friend-name">{nickname}</div>
                <div className="kt-friend-status">탭해서 닉네임 변경</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#bbb', flexShrink: 0 }}>
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className="kt-divider" />

            {/* Characters */}
            <div className="kt-section-label">캐릭터 {characters.length}</div>
            {characters.map(c => (
              <button key={c.id} className="kt-friend-row" onClick={() => setSelected(c)}>
                <div className="kt-profile-pic">
                  {c.name[0]}
                </div>
                <div className="kt-friend-info">
                  <div className="kt-friend-name">{c.name}</div>
                  <div className="kt-friend-status">{c.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Nickname edit modal */}
          {editingNickname && (
            <div className="kt-modal-overlay" onClick={() => setEditingNickname(false)}>
              <div className="kt-modal" onClick={e => e.stopPropagation()}>
                <div className="kt-modal-title">닉네임 변경</div>
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={e => setNicknameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveNickname() }}
                  placeholder="닉네임 입력"
                  autoFocus
                  maxLength={20}
                  className="kt-modal-input"
                />
                <div className="kt-modal-actions">
                  <button className="kt-modal-btn cancel" onClick={() => setEditingNickname(false)}>취소</button>
                  <button className="kt-modal-btn confirm" onClick={saveNickname} disabled={!nicknameInput.trim()}>확인</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Chat screen
  return (
    <div className="kt-page">
      <div className="kt-container">
        <div className="kt-header chat">
          <button className="kt-back-btn" onClick={goBack}>
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none"><path d="M9 1L1 9L9 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span className="kt-header-title">{selected.name}</span>
        </div>

        <div className="kt-chat-area">
          <div className="kt-date-divider">
            <span>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span>
          </div>

          {messages.map((m, i) => {
            const isUser = m.role === 'user'
            const showProfile = !isUser && (i === 0 || messages[i - 1]?.role === 'user')
            const isConsecutive = !isUser && i > 0 && messages[i - 1]?.role === 'assistant'

            return (
              <div key={i} className={`kt-msg ${isUser ? 'sent' : 'received'}`}>
                {!isUser && (
                  <div className="kt-msg-profile-col">
                    {showProfile && (
                      <div className="kt-profile-pic small">{selected.name[0]}</div>
                    )}
                  </div>
                )}
                <div className="kt-msg-body">
                  {!isUser && showProfile && (
                    <div className="kt-msg-sender">{selected.name}</div>
                  )}
                  <div className={`kt-msg-row ${isUser ? 'sent' : 'received'}`}>
                    <div className={`kt-bubble ${isUser ? 'sent' : 'received'} ${isConsecutive && !showProfile ? 'consecutive' : ''}`}>
                      {m.content.split('\n').map((line, j) => (
                        <span key={j}>
                          {line}
                          {j < m.content.split('\n').length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {loading && (
            <div className="kt-msg received">
              <div className="kt-msg-profile-col">
                {(messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
                  <div className="kt-profile-pic small">{selected.name[0]}</div>
                )}
              </div>
              <div className="kt-msg-body">
                {(messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
                  <div className="kt-msg-sender">{selected.name}</div>
                )}
                <div className="kt-msg-row received">
                  <div className="kt-bubble received kt-typing">
                    <span className="kt-dot" />
                    <span className="kt-dot" />
                    <span className="kt-dot" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="kt-input-area">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지 보내기"
            disabled={loading}
            className="kt-text-input"
          />
          <button
            className={`kt-send-btn ${input.trim() ? 'active' : ''}`}
            onClick={sendMessage}
            disabled={!input.trim() || loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
