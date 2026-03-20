import { useState, useEffect } from 'react'
import { DashboardSkeleton } from '../components/Skeleton'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table'
import type { BotStatus, UserStat, Keyword } from '../types'

export default function Dashboard() {
  const [status, setStatus] = useState<BotStatus | null>(null)
  const [userStats, setUserStats] = useState<UserStat[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])

  const fetchData = () => {
    fetch('/api/status').then(r => r.json()).then(setStatus).catch(() => {})
    fetch('/api/user-stats').then(r => r.json()).then(setUserStats).catch(() => {})
    fetch('/api/keywords').then(r => r.json()).then((d: Keyword[]) => setKeywords(d.slice(0, 10))).catch(() => {})
  }

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 5000)
    return () => clearInterval(id)
  }, [])

  if (!status) return <DashboardSkeleton />

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: 56 }}>#</TableHead>
                <TableHead>User</TableHead>
                <TableHead style={{ width: 120 }}>Messages</TableHead>
                <TableHead style={{ width: 120 }}>Replies</TableHead>
                <TableHead style={{ width: 100 }}>Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userStats.map((u, i) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <span className={`rank-num ${i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : 'default'}`}>
                      {i + 1}
                    </span>
                  </TableCell>
                  <TableCell style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{u.displayName}</TableCell>
                  <TableCell className="mono">{u.messages.toLocaleString()}</TableCell>
                  <TableCell className="mono">{u.gotReplies.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className="mono" style={{ color: 'var(--accent)' }}>
                      {u.messages > 0 ? Math.round(u.gotReplies / u.messages * 100) : 0}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="section-gap">
        <h2>Trending Keywords</h2>
        {keywords.length === 0 ? (
          <div className="empty">아직 데이터가 없습니다</div>
        ) : (
          <div className="keyword-bars">
            {keywords.map((kw, i) => (
              <div key={kw.word} className="keyword-bar-row" style={{ animationDelay: `${i * 30}ms` }}>
                <span className="keyword-bar-label mono">{kw.word}</span>
                <div className="keyword-bar-track">
                  <div
                    className="keyword-bar-fill"
                    style={{ width: `${Math.max(8, (kw.count / maxCount) * 100)}%` }}
                  />
                </div>
                <span className="keyword-bar-count mono">{kw.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function fmt(ms: number) {
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
