import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function Nav() {
  const [online, setOnline] = useState(false)

  useEffect(() => {
    const check = () => fetch('/api/status').then(r => r.json()).then(d => setOnline(d.online)).catch(() => {})
    check()
    const id = setInterval(check, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <nav>
      <div className="nav-brand">
        <span className="dot" style={{ background: online ? 'var(--green)' : 'var(--red)', boxShadow: online ? '0 0 8px rgba(35,165,89,0.5)' : 'none' }} />
        TORO
      </div>
      <div className="nav-links">
        <NavLink to="/admin">Overview</NavLink>
        <NavLink to="/admin/logs">Logs</NavLink>
        <NavLink to="/admin/settings">Settings</NavLink>
      </div>
    </nav>
  )
}
