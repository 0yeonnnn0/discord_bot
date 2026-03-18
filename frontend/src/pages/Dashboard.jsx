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

  if (!status) return <p className="hint">로딩 중...</p>

  const upMin = Math.floor(status.uptime / 1000 / 60)
  const maxCount = keywords[0]?.count || 1

  return (
    <div className="dashboard">
      <h1>봇 상태</h1>
      <div className="cards">
        <Card label="상태" value={status.online ? '● 온라인' : '○ 오프라인'}
          className={status.online ? 'text-green' : 'text-red'} />
        <Card label="업타임" value={`${upMin}분`} />
        <Card label="처리한 메시지" value={status.stats.messagesProcessed} />
        <Card label="봇 응답 수" value={status.stats.repliesSent} />
        <Card label="응답 확률" value={`${Math.round(status.config.replyChance * 100)}%`} />
      </div>

      <h2>유저별 통계</h2>
      {userStats.length === 0 ? (
        <p className="hint">아직 데이터가 없다냥</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>순위</th>
                <th>유저</th>
                <th>메시지</th>
                <th>봇 응답</th>
                <th>응답률</th>
              </tr>
            </thead>
            <tbody>
              {userStats.map((u, i) => (
                <tr key={u.id}>
                  <td>{i + 1}</td>
                  <td>{u.displayName}</td>
                  <td>{u.messages}</td>
                  <td>{u.gotReplies}</td>
                  <td>{u.messages > 0 ? Math.round(u.gotReplies / u.messages * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>인기 키워드</h2>
      {keywords.length === 0 ? (
        <p className="hint">아직 데이터가 없다냥</p>
      ) : (
        <div className="keyword-cloud">
          {keywords.map(kw => (
            <span
              key={kw.word}
              className="keyword"
              style={{ fontSize: `${0.7 + (kw.count / maxCount) * 1.3}rem` }}
              title={`${kw.count}회`}
            >
              {kw.word}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function Card({ label, value, className = '' }) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      <div className={`card-value ${className}`}>{value}</div>
    </div>
  )
}
