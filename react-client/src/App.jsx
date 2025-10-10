import { Outlet, Link, NavLink } from 'react-router-dom'
import './App.css'

export default function App() {
  return (
    <div className="app-shell">
      <nav className="nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink>
        <NavLink to="/batch" className={({ isActive }) => isActive ? 'active' : ''}>Batch</NavLink>
        <NavLink to="/report" className={({ isActive }) => isActive ? 'active' : ''}>Report</NavLink>
        <NavLink to="/compare" className={({ isActive }) => isActive ? 'active' : ''}>Compare</NavLink>
        <NavLink to="/split" className={({ isActive }) => isActive ? 'active' : ''}>Split</NavLink>
        <NavLink to="/test" className={({ isActive }) => isActive ? 'active' : ''}>Test</NavLink>
        <NavLink to="/tiktok" className={({ isActive }) => isActive ? 'active' : ''}>TikTok</NavLink>
        <NavLink to="/stories" className={({ isActive }) => isActive ? 'active' : ''}>Stories</NavLink>
        <NavLink to="/following" className={({ isActive }) => isActive ? 'active' : ''}>Following</NavLink>
        <NavLink to="/following-urls" className={({ isActive }) => isActive ? 'active' : ''}>Following URLs</NavLink>
      </nav>
      <main className="content">
        <Outlet />
      </main>
      </div>
  )
}
