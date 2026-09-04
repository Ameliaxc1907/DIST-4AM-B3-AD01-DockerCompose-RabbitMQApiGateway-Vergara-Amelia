import { useState } from 'react'
import { canWrite, getRoleLabel } from '../api/client.js'
import Icon from './Icons.jsx'

const sections = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'vehiculos', label: 'Vehículos', icon: 'car' },
  { id: 'categorias', label: 'Categorías', icon: 'tag' },
]

export default function Layout({ activeSection, onNavigate, onLogout, user, children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const roleLabel = getRoleLabel(user.rol)
  const userCanWrite = canWrite(user)

  const navigate = (section) => {
    onNavigate(section)
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
        <div className="brand">
          <span className="brand__mark"><Icon name="car" size={24} /></span>
          <span><strong>Vehículos</strong><small>{userCanWrite ? 'Panel administrativo' : 'Panel de consulta'}</small></span>
        </div>

        <nav className="sidebar__nav" aria-label="Navegación principal">
          <span className="nav-label">MENÚ</span>
          {sections.map((section) => (
            <button
              key={section.id}
              className={`nav-item ${activeSection === section.id ? 'nav-item--active' : ''}`}
              type="button"
              onClick={() => navigate(section.id)}
            >
              <Icon name={section.icon} />
              {section.label}
            </button>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="user-card">
            <span className="avatar">{user.usuario.charAt(0).toUpperCase()}</span>
            <span><strong>{user.usuario}</strong><small>{roleLabel}</small></span>
          </div>
          <button className="nav-item nav-item--logout" type="button" onClick={onLogout}>
            <Icon name="logout" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {menuOpen && <button className="sidebar-scrim" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}

      <div className="main-column">
        <header className="topbar">
          <button className="menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
            <Icon name="menu" />
          </button>
          <div>
            <span className="topbar__context">Sistema distribuido</span>
            <strong>{sections.find((item) => item.id === activeSection)?.label}</strong>
          </div>
          <span className="system-status"><i /> API Gateway</span>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}
