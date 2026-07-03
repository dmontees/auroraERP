import { FileText, FolderOpen, LayoutDashboard, LogOut, User, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AuthUser } from '../../types'

type PageId = 'dashboard' | 'projectes' | 'projecte-detail' | 'pressupostos' | 'pressupost-detail'
type SectionId = 'dashboard' | 'projectes' | 'pressupostos'

interface Props {
  page: PageId
  user: AuthUser
  children: ReactNode
  onNavigate: (page: SectionId) => void
  onLogout: () => void
}

const NAV_ITEMS: { id: SectionId; label: string; icon: ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard',  icon: <LayoutDashboard size={16} /> },
  { id: 'projectes', label: 'Projectes',  icon: <FolderOpen size={16} /> },
  { id: 'pressupostos', label: 'Pressupostos', icon: <FileText size={16} /> },
]

export default function Layout({ page, user, children, onNavigate, onLogout }: Props) {
  // 'projecte-detail' es considera dins la secció 'projectes' per al nav actiu
  const activeSection =
    page === 'projecte-detail' ? 'projectes'
    : page === 'pressupost-detail' ? 'pressupostos'
    : page

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <Zap size={16} />
            </div>
            <div className="sidebar-logo-text">
              <h2>Aurora</h2>
              <span>ERP Web</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              <User size={14} />
            </div>
            <div>
              <div className="sidebar-user-name">{user.nom || 'Usuari'}</div>
              <div className="sidebar-user-rol">{user.rol}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={onLogout}>
            <LogOut size={14} />
            Tancar sessió
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">{children}</main>
    </div>
  )
}
