import { Link } from 'react-router-dom'
import { Logo, UserIcon, ChevronDown } from './Icons.jsx'
import { useJob } from '../context/JobContext.jsx'

export default function TopBar() {
  const { phase, uploadingImage } = useJob()
  const generating = phase === 'starting' || phase === 'polling'

  return (
    <header className="topbar">
      <Link to="/" className="topbar-logo">
        <Logo />
      </Link>
      <div className="topbar-right">
        {(generating || uploadingImage) && (
          <span className="topbar-generating">
            <span className="topbar-spinner" />
            {uploadingImage ? 'Evaluating image — this may take a moment' : 'Generating — this may take a few minutes'}
          </span>
        )}
        <div className="topbar-user">
          <UserIcon />
          <ChevronDown />
        </div>
      </div>
    </header>
  )
}
