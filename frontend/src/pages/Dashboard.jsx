import { useState, useEffect } from 'react'

export default function Dashboard() {
  const [status, setStatus] = useState(null)
  const [userStats, setUserStats] = useState([])
  const [keywords, setKeywords] = useState([])

  const fetchData = () => {
    fetch('/api/status').then(r => r.json()).then(setStatus)
    fetch('/api/user-stats').then(r => r.json()).then(setUserStats)
    fetch('/api/keywords').then(r => r.json()).then(setKeywords)
  }

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 5000)
    return () => clearInterval(id)
  }, [])

  if (!status) return <div className="empty"><div className="empty-icon">...</div></div>

  const uptime = fmt(status.uptime)
  const maxCount = keywords[0]?.count || 1

  return (
    <div className="stagger">
      <div className="page-header">
        <h1>Overview</h1>
        <p className="page-desc">봇 상태와 서버 활동을 모니터링합니다</p>
      </div>

      <div className="card-grid stagger">
        <div className="card">
          <div className="card-label">Status</div>
          <div className={`status-indicator ${status.online ? 'online' : 'offline'}`}>
            <span className="dot" />
            {status.online ? 'Online' : 'Offline'}
          </div>
        </div>
        <div className="card">
          <div className="card-label">Uptime</div>
          <div className="card-value">{uptime}</div>
        </div>
        <div className="card">
          <div className="card-label">Messages</div>
          <div className="card-value">{status.stats.messagesProcessed.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="card-label">Bot Replies</div>
          <div className="card-value text-accent">{status.stats.repliesSent.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="card-label">Reply Rate</div>
          <div className="card-value">{Math.round(status.config.replyChance * 100)}%</div>
        </div>
      </div>

      <div className="section-gap">
        <h2>Users</h2>
        {userStats.length === 0 ? (
          <div className="empty">아직 데이터가 없습니다</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th>User</th>
                  <th style={{ width: 110 }}>Messages</th>
                  <th style={{ width: 110 }}>Replies</th>
                  <th style={{ width: 90 }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {userStats.map((u, i) => (
                  <tr key={u.id}>
                    <td className="mono" style={{ color: 'var(--text-tertiary)' }}>{i + 1}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.displayName}</td>
                    <td className="mono">{u.messages}</td>
                    <td className="mono">{u.gotReplies}</td>
                    <td className="mono text-accent">{u.messages > 0 ? Math.round(u.gotReplies / u.messages * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="section-gap">
        <h2>Trending Keywords</h2>
        {keywords.length === 0 ? (
          <div className="empty">아직 데이터가 없습니다</div>
        ) : (
          <div className="keyword-cloud">
            {keywords.map(kw => (
              <span
                key={kw.word}
                className="keyword"
                style={{ fontSize: `${0.75 + (kw.count / maxCount) * 0.45}rem` }}
                title={`${kw.count}회`}
              >
                {kw.word}
                <span style={{ opacity: 0.45, marginLeft: 5, fontSize: '0.65rem' }}>{kw.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function fmt(ms) {
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
