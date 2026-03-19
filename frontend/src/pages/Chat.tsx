import { useState, useEffect, useRef } from 'react'

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
  const [nickname, setNickname] = useState('')
  const [nicknameSet, setNicknameSet] = useState(false)
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
    if (selected && nicknameSet) {
      inputRef.current?.focus()
    }
  }, [selected, nicknameSet])

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
          nickname: nickname || '익명',
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
    setNicknameSet(false)
  }

  // Character select screen
  if (!selected) {
    return (
      <div className="chat-page">
        <div className="chat-container">
          <div className="chat-select-screen">
            <div className="chat-logo">TORO</div>
            <p className="chat-subtitle">대화할 캐릭터를 골라봐</p>
            <div className="chat-character-list">
              {characters.map(c => (
                <button
                  key={c.id}
                  className="chat-character-card"
                  onClick={() => setSelected(c)}
                >
                  <div className="chat-character-avatar">
                    {c.name[0]}
                  </div>
                  <div className="chat-character-info">
                    <div className="chat-character-name">{c.name}</div>
                    <div className="chat-character-desc">{c.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Nickname input screen
  if (!nicknameSet) {
    return (
      <div className="chat-page">
        <div className="chat-container">
          <div className="chat-select-screen">
            <div className="chat-logo">{selected.name}</div>
            <p className="chat-subtitle">닉네임을 알려줘</p>
            <form
              className="chat-nickname-form"
              onSubmit={e => {
                e.preventDefault()
                if (nickname.trim()) setNicknameSet(true)
              }}
            >
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="닉네임 입력"
                autoFocus
                maxLength={20}
                className="chat-nickname-input"
              />
              <button
                type="submit"
                className="chat-nickname-btn"
                disabled={!nickname.trim()}
              >
                시작
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Chat screen
  return (
    <div className="chat-page">
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <button className="chat-back-btn" onClick={goBack}>←</button>
          <div className="chat-header-info">
            <span className="chat-header-name">{selected.name}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages-area">
          {messages.length === 0 && (
            <div className="chat-empty">
              <span>{selected.name}에게 말을 걸어봐!</span>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role}`}>
              {m.role === 'assistant' && (
                <div className="chat-bubble-name">{selected.name}</div>
              )}
              <div className="chat-bubble-content">
                {m.content.split('\n').map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < m.content.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-bubble assistant">
              <div className="chat-bubble-name">{selected.name}</div>
              <div className="chat-bubble-content chat-typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력해..."
            disabled={loading}
            className="chat-text-input"
          />
          <button
            className="chat-send-btn"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
