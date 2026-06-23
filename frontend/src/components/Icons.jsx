// Lightweight inline SVG icons so the app stays self-contained (no icon deps).

export function Logo({ size = 34 }) {
  return (
    <span className="logo" aria-label="UX Lens">
      <span className="logo-text">UX</span>
      <svg
        className="logo-lens"
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="17" cy="17" r="13" stroke="#111" strokeWidth="2.4" fill="white" />
        <line x1="26.5" y1="26.5" x2="36" y2="36" stroke="#111" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="logo-text">Lens</span>
    </span>
  )
}

export function UserIcon({ size = 22, color = '#1d1b20' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8" />
      <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function UsersIcon({ size = 22, color = '#1d1b20' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="8" r="3.4" stroke={color} strokeWidth="1.6" />
      <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 5.2A3.4 3.4 0 0 1 16 12M18 14c2.4.5 4 2.3 4 4.8" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function ChevronDown({ size = 16, color = '#1d1b20' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronUp({ size = 16, color = '#1d1b20' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 15l6-6 6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ArrowLeft({ size = 20, color = '#444' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 5l-7 7 7 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ArrowRight({ size = 20, color = '#444' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 5l7 7-7 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SendIcon({ size = 18, color = '#1a73e8' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 11l18-8-8 18-2.5-7.5L3 11z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

export function EditIcon({ size = 16, color = '#1a73e8' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 20h4l10-10-4-4L4 16v4z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 6l4 4" stroke={color} strokeWidth="1.6" />
    </svg>
  )
}

export function ChatIcon({ size = 18, color = '#1a73e8' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 5h16v11H9l-5 4V5z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export function BulbIcon({ size = 16, color = '#f5a623' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10c.8.7 1 1.2 1 2h6c0-.8.2-1.3 1-2a6 6 0 0 0-4-10z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ClockIcon({ size = 16, color = '#666' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
      <path d="M12 7v5l3.5 2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function CheckIcon({ size = 18, color = '#1f9d55' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 12.5l4.5 4.5L19 7" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CrossIcon({ size = 18, color = '#d23f3f' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function PaperclipIcon({ size = 16, color = '#666' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 11l-8 8a5 5 0 0 1-7-7l8-8a3.3 3.3 0 0 1 5 5l-8 8a1.6 1.6 0 0 1-2.4-2.2L18 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DesktopIcon({ size = 16, color = '#444' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="12" rx="1.5" stroke={color} strokeWidth="1.6" />
      <path d="M9 20h6M12 16v4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function TabletIcon({ size = 16, color = '#444' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="3" width="14" height="18" rx="2" stroke={color} strokeWidth="1.6" />
      <path d="M11 18h2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function MobileIcon({ size = 16, color = '#444' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="7" y="2" width="10" height="20" rx="2.2" stroke={color} strokeWidth="1.6" />
      <path d="M11 18.5h2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function ListIcon({ size = 18, color = '#1a73e8' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 6h12M8 12h12M8 18h12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="3.5" cy="6" r="1.3" fill={color} />
      <circle cx="3.5" cy="12" r="1.3" fill={color} />
      <circle cx="3.5" cy="18" r="1.3" fill={color} />
    </svg>
  )
}

export function ArchitectureIcon({ size = 18, color = '#1a73e8' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
      <path d="M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5-1.3 1.8-3 2-3 .6-3 2 1.3 2.5 3 2.5 3-1.1 3-2.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function CTAIcon({ size = 18, color = '#1a73e8' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 5h16v11H9l-5 4V5z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 10h8M8 13h5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function NavigationIcon({ size = 18, color = '#1a73e8' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="1.6" />
      <path d="M16.3 16.3L21 21" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11 8l2 2-2 2-2-2z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

export function MicIcon({ size = 16, color = '#666' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke={color} strokeWidth="1.6" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
