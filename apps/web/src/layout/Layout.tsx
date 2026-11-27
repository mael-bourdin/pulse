import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'

// Navigation de l'espace personnel (HAC-UX-001 p.5). Le nom de l'utilisateur et le bouton
// « Se déconnecter » arrivent avec la session (F1-R40 à R43).
const LINKS = [
  { to: '/', label: 'Mon espace', end: true },
  { to: '/objectifs', label: 'Objectifs' },
  { to: '/defis', label: 'Défis' },
  { to: '/progression', label: 'Progression' },
  { to: '/preferences', label: 'Préférences' },
]

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <header className="topbar">
        <div className="topbar__inner">
          <span className="brand">PULSE</span>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="menu-principal"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
          <nav id="menu-principal" aria-label="Menu principal" className={menuOpen ? 'nav nav--open' : 'nav'}>
            <ul>
              {LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.end} onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="contenu" tabIndex={-1} className="content">
        <Outlet />
      </main>
    </>
  )
}
