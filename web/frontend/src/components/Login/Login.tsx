import { useState } from 'react'
import { Zap } from 'lucide-react'
import { login } from '../../api/auth'
import type { AuthUser } from '../../types'

interface Props {
  onLogin: (user: AuthUser) => void
}

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(username.trim(), password)
      onLogin(res.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de connexió')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <Zap size={20} />
          </div>
          <div>
            <h1>Aurora</h1>
            <span>Gestió audiovisual</span>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Usuari</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="usuari"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contrasenya</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Entrant...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
