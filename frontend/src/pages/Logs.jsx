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
    <div className="dashboard">
      <h1>메시지 로그</h1>
      <div className="log-controls">
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">전체 채널</option>
          {channels.map(ch => (
            <option key={ch} value={ch}>#{ch}</option>
          ))}
        </select>
        <span className="hint">{filtered.length}개 메시지 (5초마다 갱신)</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>시간</th>
              <th>채널</th>
              <th>작성자</th>
              <th>내용</th>
              <th>봇 응답</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log, i) => (
              <tr key={i} className={log.botReplied ? 'row-replied' : ''}>
                <td>{new Date(log.timestamp).toLocaleTimeString('ko-KR')}</td>
                <td>#{log.channel}</td>
                <td>{log.author}</td>
                <td>{log.content}</td>
                <td>{log.botReply || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
