import { useState } from 'react'
import { toast } from 'sonner'
import { Toaster } from '../components/ui/sonner'

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [shaking, setShaking] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      onSuccess()
    } else {
      toast.error('Wrong password')
      setPassword('')
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
    }
  }

  return (
    <>
      <nav>
        <div className="nav-brand">
          <span className="dot" style={{ background: 'var(--accent)' }} />
          TORO
        </div>
      </nav>
      <main>
        <div className="login-wrap">
          <div
            className="login-box"
            style={{
              animation: shaking ? 'shake 0.4s ease-in-out' : 'fade-up 0.5s ease-out',
            }}
          >
            <div className="brand">TORO</div>
            <div className="subtitle">Discord Bot Dashboard</div>
            <form onSubmit={handleSubmit}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
              />
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '0.25rem' }}>
                Enter
              </button>
            </form>
          </div>
        </div>
      </main>
      <Toaster position="top-right" />
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
    </>
  )
}
