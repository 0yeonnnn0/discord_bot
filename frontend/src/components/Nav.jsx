import { NavLink } from 'react-router-dom'

export default function Nav() {
  return (
    <nav>
      <div className="nav-brand">TORO Bot =^0w0^=</div>
      <div className="nav-links">
        <NavLink to="/">대시보드</NavLink>
        <NavLink to="/logs">로그</NavLink>
        <NavLink to="/settings">설정</NavLink>
      </div>
    </nav>
  )
}
