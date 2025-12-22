import { Outlet, Link, NavLink } from 'react-router-dom'
import { useState } from 'react'
import './App.css'
import ThemeToggle from './components/common/ThemeToggle.jsx'

export default function App() {
  const [showReportsDropdown, setShowReportsDropdown] = useState(false)

  const reportPages = [
    { path: '/db-report', label: 'DB Report' },
    { path: '/reports/summary', label: 'Summary Dashboard' },
    { path: '/reports/top-users', label: 'Top Users' },
    { path: '/reports/inactive-users', label: 'Inactive Users' },
    { path: '/reports/user-engagement', label: 'User Engagement' },
    { path: '/reports/download-timeline', label: 'Download Timeline' },
    { path: '/reports/api-frequency', label: 'API Frequency' },
    { path: '/reports/completion-trends', label: 'Completion Trends' },
    { path: '/reports/media-deduplication', label: 'Media Deduplication' },
    { path: '/reports/completion-by-api', label: 'Completion by API' },
    { path: '/reports/username-changes', label: 'Username Changes' },
    { path: '/reports/duplicate-usernames', label: 'Duplicate Usernames' },
    { path: '/reports/cursor-progress', label: 'Cursor Progress' },
    { path: '/reports/platform-comparison', label: 'Platform Comparison' },
    { path: '/reports/cohort-analysis', label: 'Cohort Analysis' },
    { path: '/reports/api-health', label: 'API Health' },
  ]

  return (
    <div className="app-shell">
      <nav className="nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink>
        <NavLink to="/batch" className={({ isActive }) => isActive ? 'active' : ''}>Batch</NavLink>
        <NavLink to="/report" className={({ isActive }) => isActive ? 'active' : ''}>Report</NavLink>

        <div
          className="nav-dropdown"
          onMouseEnter={() => setShowReportsDropdown(true)}
          onMouseLeave={() => setShowReportsDropdown(false)}
        >
          <span className="nav-dropdown-trigger">Reports ▼</span>
          {showReportsDropdown && (
            <div className="nav-dropdown-menu">
              {reportPages.map(({ path, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <NavLink to="/compare" className={({ isActive }) => isActive ? 'active' : ''}>Compare</NavLink>
        <NavLink to="/split" className={({ isActive }) => isActive ? 'active' : ''}>Split</NavLink>
        <NavLink to="/test" className={({ isActive }) => isActive ? 'active' : ''}>Test</NavLink>
        <NavLink to="/tiktok" className={({ isActive }) => isActive ? 'active' : ''}>TikTok</NavLink>
        <NavLink to="/stories" className={({ isActive }) => isActive ? 'active' : ''}>Stories</NavLink>
        <NavLink to="/following" className={({ isActive }) => isActive ? 'active' : ''}>Following</NavLink>
        <NavLink to="/following-urls" className={({ isActive }) => isActive ? 'active' : ''}>Following URLs</NavLink>
        <NavLink to="/platform-urls" className={({ isActive }) => isActive ? 'active' : ''}>Platform URLs</NavLink>
        <ThemeToggle />
      </nav>
      <main className="content">
        <Outlet />
      </main>
      </div>
  )
}
