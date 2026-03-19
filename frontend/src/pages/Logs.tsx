import { useState, useEffect } from 'react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table'
import type { LogEntry, EventEntry, ErrorEntry, ChatLogEntry } from '../types'

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [events, setEvents] = useState<EventEntry[]>([])
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [chatLogs, setChatLogs] = useState<ChatLogEntry[]>([])
  const [filter, setFilter] = useState('')
  const [tab, setTab] = useState('messages')

  const fetchData = () => {
    fetch('/api/logs').then(r => r.json()).then(data => setLogs(data.reverse()))
    fetch('/api/events').then(r => r.json()).then(setEvents)
    fetch('/api/errors').then(r => r.json()).then(setErrors)
    fetch('/api/chat-logs?limit=200').then(r => r.json()).then(setChatLogs).catch(() => {})
  }

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 5000)
    return () => clearInterval(id)
  }, [])

  const channels = [...new Set(logs.map(l => l.channel))]
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
          {['messages', 'web-chat', 'events', 'errors'].map(t => (
            <a key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}
              style={{ cursor: 'pointer' }}>
              {t === 'messages' ? 'Messages' :
               t === 'web-chat' ? 'Web Chat' :
               t === 'events' ? 'Events' :
               'Errors'}
              <span className="mono" style={{ marginLeft: 6, fontSize: '0.7rem', opacity: 0.5 }}>
                {t === 'messages' ? logs.length : t === 'web-chat' ? chatLogs.length : t === 'events' ? events.length : errors.length}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Messages Tab */}
      {tab === 'messages' && (
        <>
          <div className="log-controls">
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All Channels</option>
              {channels.map(ch => <option key={ch} value={ch}>#{ch}</option>)}
            </select>
            <span className="hint mono">{filtered.length} entries</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: 80 }}>Time</TableHead>
                <TableHead style={{ width: 100 }}>Server</TableHead>
                <TableHead style={{ width: 100 }}>Channel</TableHead>
                <TableHead style={{ width: 90 }}>Author</TableHead>
                <TableHead style={{ width: 300 }}>Message</TableHead>
                <TableHead style={{ width: 60 }}>Trigger</TableHead>
                <TableHead style={{ width: 50 }}>RAG</TableHead>
                <TableHead style={{ width: 55 }}>Speed</TableHead>
                <TableHead style={{ width: 100 }}>Model</TableHead>
                <TableHead style={{ width: 400 }}>Bot Reply</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-tertiary)' }}>
                    로그가 없습니다
                  </TableCell>
                </TableRow>
              ) : filtered.map((log, i) => (
                <TableRow
                  key={i}
                  className={log.error ? 'row-error' : log.botReplied ? 'row-replied' : ''}
                >
                  <TableCell className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </TableCell>
                  <TableCell style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{log.guild || '—'}</TableCell>
                  <TableCell style={{ color: 'var(--text-tertiary)' }}>#{log.channel}</TableCell>
                  <TableCell style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.author}</TableCell>
                  <TableCell className="wrap" style={{ color: 'var(--text-primary)' }}>{log.content}</TableCell>
                  <TableCell>
                    {log.triggerReason && (
                      <span className={`log-badge ${log.triggerReason}`}>
                        {log.triggerReason === 'mention' ? '@' : '%'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="mono" style={{ fontSize: '0.73rem', color: log.ragHits > 0 ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                    {log.ragHits > 0 ? `${log.ragHits}` : '—'}
                  </TableCell>
                  <TableCell className="mono" style={{ fontSize: '0.73rem', color: getSpeedColor(log.responseTime) }}>
                    {log.responseTime ? `${(log.responseTime / 1000).toFixed(1)}s` : '—'}
                  </TableCell>
                  <TableCell className="mono" style={{ fontSize: '0.7rem', color: log.model ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
                    {log.model || '—'}
                  </TableCell>
                  <TableCell className="wrap" style={{ color: log.error ? 'var(--red)' : log.botReply === '<SKIP>' ? 'var(--text-tertiary)' : log.botReply ? 'var(--accent)' : 'var(--text-tertiary)', fontSize: '0.83rem', fontStyle: log.botReply === '<SKIP>' ? 'italic' : 'normal' }}>
                    {log.error ? `[${log.error}]` : log.botReply || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {/* Web Chat Tab */}
      {tab === 'web-chat' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: 80 }}>Time</TableHead>
              <TableHead style={{ width: 90 }}>Character</TableHead>
              <TableHead style={{ width: 90 }}>Nickname</TableHead>
              <TableHead>User Message</TableHead>
              <TableHead style={{ width: 100 }}>Model</TableHead>
              <TableHead style={{ width: 350 }}>Bot Reply</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chatLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-tertiary)' }}>
                  웹 채팅 로그가 없습니다
                </TableCell>
              </TableRow>
            ) : chatLogs.map((log) => (
              <TableRow key={log.id} className="row-replied">
                <TableCell className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </TableCell>
                <TableCell>
                  <span className="log-badge mention">{log.characterName}</span>
                </TableCell>
                <TableCell style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.nickname}</TableCell>
                <TableCell className="wrap" style={{ color: 'var(--text-primary)' }}>{log.userMessage}</TableCell>
                <TableCell className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{log.model || '—'}</TableCell>
                <TableCell className="wrap" style={{ color: 'var(--accent)', fontSize: '0.83rem' }}>{log.botReply}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Events Tab */}
      {tab === 'events' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: 170 }}>Time</TableHead>
              <TableHead style={{ width: 150 }}>Type</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-tertiary)' }}>
                  이벤트가 없습니다
                </TableCell>
              </TableRow>
            ) : events.map((ev, i) => (
              <TableRow key={i}>
                <TableCell className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  {new Date(ev.timestamp).toLocaleString('ko-KR')}
                </TableCell>
                <TableCell>
                  <span className={`log-badge ${ev.type}`}>{ev.type.replace(/_/g, ' ')}</span>
                </TableCell>
                <TableCell style={{ color: 'var(--text-primary)' }}>{ev.detail}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Errors Tab */}
      {tab === 'errors' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: 170 }}>Time</TableHead>
              <TableHead style={{ width: 130 }}>Type</TableHead>
              <TableHead>Message</TableHead>
              <TableHead style={{ width: 200 }}>Context</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-tertiary)' }}>
                  에러가 없습니다
                </TableCell>
              </TableRow>
            ) : errors.map((err, i) => (
              <TableRow key={i} className="row-error">
                <TableCell className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  {new Date(err.timestamp).toLocaleString('ko-KR')}
                </TableCell>
                <TableCell>
                  <span className="log-badge rate_limit">{err.type.replace(/_/g, ' ')}</span>
                </TableCell>
                <TableCell className="wrap" style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{err.message}</TableCell>
                <TableCell style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>{err.detail}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function getSpeedColor(ms: number | null) {
  if (!ms) return 'var(--text-tertiary)'
  if (ms < 2000) return 'var(--green)'
  if (ms < 5000) return 'var(--amber)'
  return 'var(--red)'
}
