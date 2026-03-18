import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Nav from './components/Nav'
import Dashboard from './pages/Dashboard'
import Logs from './pages/Logs'
import Settings from './pages/Settings'
import Login from './pages/Login'

function App() {
  const [authed, setAuthed] = useState(null)

  useEffect(() => {
    fetch('/api/status')
      .then(res => {
        if (res.status === 401) setAuthed(false)
        else { setAuthed(true); return res.json() }
      })
      .catch(() => setAuthed(false))
  }, [])

  if (authed === null) return null

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />
  }

  return (
    <>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </>
  )
}

export default App
