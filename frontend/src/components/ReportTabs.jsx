import { NavLink } from 'react-router-dom'
import { UsersIcon } from './Icons.jsx'

const tabs = [
  { to: '/report/heuristic', label: 'Heuristic evaluation' },
  { to: '/report/attention', label: 'Attention insight' },
  { to: '/report/competitor', label: 'Competitor analysis' },
  { to: '/report/accessibility', label: 'Accessibility' },
]

export default function ReportTabs() {
  return (
    <div className="report-tabbar">
      <nav className="report-tabs" role="tablist">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => 'report-tab' + (isActive ? ' active' : '')}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="report-tabbar-actions">
        <button className="icon-btn" title="Share with team" aria-label="Share with team">
          <UsersIcon size={20} />
        </button>
        <button className="icon-btn" title="Download report" aria-label="Download report">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="#1a73e8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="icon-btn" title="Send" aria-label="Send">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 11l18-8-8 18-2.5-7.5L3 11z" stroke="#1a73e8" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
