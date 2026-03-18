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

  if (!status) return <div className="empty"><div className="empty-icon">...</div>Loading</div>

  const uptime = formatUptime(status.uptime)
  const maxCount = keywords[0]?.count || 1

  return (
    <div className="stagger">
      <div>
        <h1>Overview</h1>
        <p className="page-desc">봇 상태 및 서버 활동을 모니터링합니다</p>
      </div>

      <div className="card-grid stagger">
        <StatCard label="Status" className={status.online ? 'text-green' : 'text-red'}>
          <div className={`status-indicator ${status.online ? 'online' : 'offline'}`}>
            <span className="dot" />
            {status.online ? 'Online' : 'Offline'}
          </div>
        </StatCard>
        <StatCard label="Uptime" value={uptime} />
        <StatCard label="Messages" value={status.stats.messagesProcessed.toLocaleString()} />
        <StatCard label="Replies" value={status.stats.repliesSent.toLocaleString()} />
        <StatCard label="Reply Rate" value={`${Math.round(status.config.replyChance * 100)}%`} className="text-accent" />
      </div>

      <h2>Users</h2>
      {userStats.length === 0 ? (
        <div className="empty">아직 데이터가 없습니다</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Messages</th>
                <th>Bot Replies</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {userStats.map((u, i) => (
                <tr key={u.id}>
                  <td className="mono" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.displayName}</td>
                  <td className="mono">{u.messages}</td>
                  <td className="mono">{u.gotReplies}</td>
                  <td className="mono text-accent">
                    {u.messages > 0 ? Math.round(u.gotReplies / u.messages * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Trending Keywords</h2>
      {keywords.length === 0 ? (
        <div className="empty">아직 데이터가 없습니다</div>
      ) : (
        <div className="keyword-cloud">
          {keywords.map(kw => (
            <span
              key={kw.word}
              className="keyword"
              style={{ fontSize: `${0.75 + (kw.count / maxCount) * 0.5}rem` }}
              title={`${kw.count}회`}
            >
              {kw.word}
              <span style={{ opacity: 0.5, marginLeft: 4, fontSize: '0.7rem' }}>{kw.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, children, className = '' }) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      {children || <div className={`card-value ${className}`}>{value}</div>}
    </div>
  )
}

function formatUptime(ms) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
