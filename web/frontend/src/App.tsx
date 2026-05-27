import { useState, useEffect } from 'react'
import { checkSession } from './api/auth'
import { logout } from './api/auth'
import type { AuthUser } from './types'
import Login from './components/Login/Login'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/Dashboard'
import ProjectesList from './components/Projectes/ProjectesList'
import ProjecteDetail from './components/Projectes/ProjecteDetail'

// Pàgines disponibles de l'app
type Page =
  | { id: 'dashboard' }
  | { id: 'projectes' }
  | { id: 'projecte-detail'; codi: string }

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [page, setPage] = useState<Page>({ id: 'dashboard' })

  // Comprova si hi ha una sessió activa en carregar
  useEffect(() => {
    checkSession().then((u) => {
      setUser(u)
      setChecking(false)
    })
  }, [])

  if (checking) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={setUser} />
  }

  async function handleLogout() {
    await logout()
    setUser(null)
    setPage({ id: 'dashboard' })
  }

  function navigate(p: Page) {
    setPage(p)
  }

  return (
    <Layout
      page={page.id}
      user={user}
      onNavigate={(id) => navigate({ id } as Page)}
      onLogout={handleLogout}
    >
      {page.id === 'dashboard' && (
        <Dashboard onNavigateProjecte={(codi) => navigate({ id: 'projecte-detail', codi })} />
      )}
      {page.id === 'projectes' && (
        <ProjectesList
          onSelectProjecte={(codi) => navigate({ id: 'projecte-detail', codi })}
        />
      )}
      {page.id === 'projecte-detail' && (
        <ProjecteDetail
          codi={page.codi}
          onBack={() => navigate({ id: 'projectes' })}
        />
      )}
    </Layout>
  )
}
