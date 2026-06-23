// A CSS-only mock of the evaluated banking homepage. Used as the base "screenshot"
// for the Heuristic Evaluation and Attention Insight screens so the demo needs
// no external image assets.

export default function MockBankPage({ pins = [] }) {
  return (
    <div className="bankpage">
      <div className="bankpage-topstrip">
        <span>About us</span>
        <span>Financial education</span>
        <span className="bankpage-topstrip-right">Support · Locations · U.S. Bank Smart Assistant</span>
        <span className="bankpage-login-pill">Log in</span>
      </div>

      <div className="bankpage-nav">
        <span className="bankpage-brand">
          <span className="bankpage-brand-mark">US</span>bank
        </span>
        <nav className="bankpage-menu">
          <span>Personal</span>
          <span>Wealth Management</span>
          <span>Business</span>
          <span>Corporate &amp; Commercial</span>
          <span>Institutional</span>
        </nav>
      </div>

      <div className="bankpage-fdic">FDIC — Deposits are backed by the full faith and credit of the U.S. Government</div>

      <div className="bankpage-hero">
        <div className="bankpage-hero-copy">
          <p className="bankpage-eyebrow">PERSONAL BANKING</p>
          <h3>Make your money work as hard as you do.</h3>
          <p className="bankpage-sub">Save more with both Bank Smartly® Checking and Savings.</p>
          <div className="bankpage-cta-row">
            <button className="bankpage-cta primary">Open accounts</button>
            <button className="bankpage-cta ghost">Learn more</button>
          </div>
        </div>
        <div className="bankpage-hero-art">
          <div className="bankpage-photo" />
        </div>
        <div className="bankpage-login">
          <p className="bankpage-login-title">ACCOUNT LOGIN</p>
          <label>Username</label>
          <div className="bankpage-field" />
          <label>Password</label>
          <div className="bankpage-field" />
          <button className="bankpage-login-btn">Log in</button>
          <p className="bankpage-login-link">Forgot username or password?</p>
        </div>
      </div>

      {pins.map((p) => (
        <span
          key={p.n}
          className="bankpage-pin"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          {p.n}
        </span>
      ))}
    </div>
  )
}
