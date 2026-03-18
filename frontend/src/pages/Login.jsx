import { useState } from 'react'

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

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
      setError('비밀번호가 틀렸다냥 냥냥펀치!!')
      setPassword('')
    }
  }

  return (
    <>
      <nav><div className="nav-brand">TORO Bot =^0w0^=</div></nav>
      <main>
        <div className="login-wrap">
          <div className="login-box">
            <h2>=^0w0^=</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                autoFocus
              />
              <button className="btn" style={{ width: '100%' }}>들어가기</button>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}
