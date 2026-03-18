import { useState, useEffect } from 'react'

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('')

  const fetchLogs = () => {
    fetch('/api/logs').then(r => r.json()).then(data => setLogs(data.reverse()))
  }

  useEffect(() => {
    fetchLogs()
    const id = setInterval(fetchLogs, 5000)
    return () => clearInterval(id)
  }, [])

  const channels = [...new Set(logs.map(l => l.channel))]
  const filtered = filter ? logs.filter(l => l.channel === filter) : logs

  return (
    <div className="stagger">
      <div>
        <h1>Logs</h1>
        <p className="page-desc">실시간 메시지 로그 (5초 간격 갱신)</p>
      </div>

      <div className="log-controls">
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Channels</option>
          {channels.map(ch => (
            <option key={ch} value={ch}>#{ch}</option>
          ))}
        </select>
        <span className="hint mono">{filtered.length} entries</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 90 }}>Time</th>
              <th style={{ width: 110 }}>Channel</th>
              <th style={{ width: 100 }}>Author</th>
              <th>Message</th>
              <th>Bot Reply</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>로그가 없습니다</td></tr>
            ) : filtered.map((log, i) => (
              <tr key={i} className={log.botReplied ? 'row-replied' : ''}>
                <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td style={{ color: 'var(--text-muted)' }}>#{log.channel}</td>
                <td style={{ fontWeight: 500 }}>{log.author}</td>
                <td>{log.content}</td>
                <td style={{ color: log.botReply ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {log.botReply || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
