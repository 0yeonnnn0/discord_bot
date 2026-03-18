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
            <div className="cat-face">
              <div className="cat-ears">
                <span className="ear left" />
                <span className="ear right" />
              </div>
              <div className="cat-head">
                <div className="cat-eyes">
                  <span className="eye">0</span>
                  <span className="nose">w</span>
                  <span className="eye">0</span>
                </div>
                <div className="cat-whiskers">
                  <div className="whisker-group left">
                    <span /><span /><span />
                  </div>
                  <div className="whisker-group right">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            </div>
            <div className="brand">TORO</div>
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

        .cat-face {
          margin-bottom: 1.2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .cat-ears {
          display: flex;
          gap: 36px;
          margin-bottom: -8px;
          position: relative;
          z-index: 1;
        }

        .ear {
          display: block;
          width: 0;
          height: 0;
          border-left: 14px solid transparent;
          border-right: 14px solid transparent;
          border-bottom: 22px solid var(--accent);
        }

        .ear.left { transform: rotate(-12deg); }
        .ear.right { transform: rotate(12deg); }

        .cat-head {
          background: var(--bg-input);
          border: 2px solid var(--accent);
          border-radius: 50%;
          width: 100px;
          height: 90px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .cat-eyes {
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-mono);
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--accent);
          line-height: 1;
        }

        .eye {
          animation: blink-eye 3s ease-in-out infinite;
        }

        .nose {
          font-size: 1.1rem;
          color: var(--text-tertiary);
          margin: 0 2px;
        }

        @keyframes blink-eye {
          0%, 90%, 100% { opacity: 1; }
          95% { opacity: 0; }
        }

        .cat-whiskers {
          position: absolute;
          width: 160px;
          top: 52px;
          display: flex;
          justify-content: space-between;
          pointer-events: none;
        }

        .whisker-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .whisker-group span {
          display: block;
          width: 28px;
          height: 1.5px;
          background: var(--border-hover);
          border-radius: 1px;
        }

        .whisker-group.left span:nth-child(1) { transform: rotate(-12deg); }
        .whisker-group.left span:nth-child(2) { transform: rotate(0deg); }
        .whisker-group.left span:nth-child(3) { transform: rotate(12deg); }

        .whisker-group.right span:nth-child(1) { transform: rotate(12deg); }
        .whisker-group.right span:nth-child(2) { transform: rotate(0deg); }
        .whisker-group.right span:nth-child(3) { transform: rotate(-12deg); }

        .cat-face:hover .ear.left { transform: rotate(-20deg); transition: 0.2s; }
        .cat-face:hover .ear.right { transform: rotate(20deg); transition: 0.2s; }
        .cat-face:hover .cat-eyes .eye { color: #fff; }
      `}</style>
    </>
  )
}
