import { useState, useEffect } from 'react'

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [events, setEvents] = useState([])
  const [errors, setErrors] = useState([])
  const [filter, setFilter] = useState('')
  const [tab, setTab] = useState('messages')

  const fetchData = () => {
    fetch('/api/logs').then(r => r.json()).then(data => setLogs(data.reverse()))
    fetch('/api/events').then(r => r.json()).then(setEvents)
    fetch('/api/errors').then(r => r.json()).then(setErrors)
  }

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 5000)
    return () => clearInterval(id)
  }, [])

  const channels = [...new Set(logs.map(l => l.channel))]
  const guilds = [...new Set(logs.map(l => l.guild).filter(Boolean))]
  const filtered = filter ? logs.filter(l => l.channel === filter) : logs

  return (
    <div className="stagger">
      <div className="page-header">
        <h1>Logs</h1>
        <p className="page-desc">메시지, 이벤트, 에러 로그 — 5초 간격 갱신</p>
      </div>

      {/* Tab Switcher */}
      <div className="log-controls">
        <div className="nav-links" style={{ gap: '2px' }}>
          {['messages', 'events', 'errors'].map(t => (
            <a key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}
              style={{ cursor: 'pointer' }}>
              {t === 'messages' ? `Messages (${logs.length})` :
               t === 'events' ? `Events (${events.length})` :
               `Errors (${errors.length})`}
            </a>
          ))}
        </div>
      </div>

      {/* ── Messages Tab ── */}
      {tab === 'messages' && (
        <>
          <div className="log-controls">
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All Channels</option>
              {channels.map(ch => <option key={ch} value={ch}>#{ch}</option>)}
            </select>
            <span className="hint mono">{filtered.length} entries</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Time</th>
                  <th style={{ width: 100 }}>Server</th>
                  <th style={{ width: 100 }}>Channel</th>
                  <th style={{ width: 90 }}>Author</th>
                  <th>Message</th>
                  <th style={{ width: 70 }}>Trigger</th>
                  <th style={{ width: 55 }}>RAG</th>
                  <th style={{ width: 60 }}>Speed</th>
                  <th style={{ width: 180 }}>Bot Reply</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="empty">로그가 없습니다</td></tr>
                ) : filtered.map((log, i) => (
                  <tr key={i} className={log.error ? 'row-error' : log.botReplied ? 'row-replied' : ''}>
                    <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{log.guild || '—'}</td>
                    <td style={{ color: 'var(--text-tertiary)' }}>#{log.channel}</td>
                    <td style={{ fontWeight: 500 }}>{log.author}</td>
                    <td>{log.content}</td>
                    <td>
                      {log.triggerReason && (
                        <span className={`log-badge ${log.triggerReason}`}>
                          {log.triggerReason === 'mention' ? '@' : '%'}
                        </span>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: '0.75rem', color: log.ragHits > 0 ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                      {log.ragHits > 0 ? `${log.ragHits}hit` : '—'}
                    </td>
                    <td className="mono" style={{ fontSize: '0.75rem', color: getSpeedColor(log.responseTime) }}>
                      {log.responseTime ? `${(log.responseTime / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td style={{ color: log.error ? 'var(--red)' : log.botReply ? 'var(--accent)' : 'var(--text-tertiary)', fontSize: '0.83rem' }}>
                      {log.error ? `[${log.error}]` : log.botReply || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Events Tab ── */}
      {tab === 'events' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 150 }}>Time</th>
                <th style={{ width: 140 }}>Type</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={3} className="empty">이벤트가 없습니다</td></tr>
              ) : events.map((ev, i) => (
                <tr key={i}>
                  <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    {new Date(ev.timestamp).toLocaleString('ko-KR')}
                  </td>
                  <td>
                    <span className={`log-badge ${ev.type}`}>{ev.type}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{ev.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Errors Tab ── */}
      {tab === 'errors' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 150 }}>Time</th>
                <th style={{ width: 120 }}>Type</th>
                <th>Message</th>
                <th style={{ width: 200 }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {errors.length === 0 ? (
                <tr><td colSpan={4} className="empty">에러가 없습니다</td></tr>
              ) : errors.map((err, i) => (
                <tr key={i}>
                  <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    {new Date(err.timestamp).toLocaleString('ko-KR')}
                  </td>
                  <td>
                    <span className="log-badge rate_limit">{err.type}</span>
                  </td>
                  <td style={{ color: 'var(--red)', fontSize: '0.83rem', wordBreak: 'break-all' }}>{err.message}</td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>{err.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function getSpeedColor(ms) {
  if (!ms) return 'var(--text-tertiary)'
  if (ms < 2000) return 'var(--green)'
  if (ms < 5000) return 'var(--amber)'
  return 'var(--red)'
}
