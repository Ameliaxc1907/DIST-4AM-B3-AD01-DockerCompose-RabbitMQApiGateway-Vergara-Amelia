import { useEffect, useState } from 'react'
import Icon from './Icons.jsx'

export default function Login({ onLogin, initialError = '' }) {
  const [credentials, setCredentials] = useState({ usuario: 'admin', password: '' })
  const [error, setError] = useState(initialError)
  const [loading, setLoading] = useState(false)

  useEffect(() => setError(initialError), [initialError])

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    if (!credentials.usuario.trim() || !credentials.password) {
      setError('Ingrese el usuario y la contraseña.')
      return
    }

    setLoading(true)
    try {
      await onLogin(credentials)
    } catch (requestError) {
      setError(requestError.message || 'No fue posible iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand brand--login">
          <span className="brand__mark"><Icon name="car" size={26} /></span>
          <span><strong>Vehículos</strong><small>Control administrativo</small></span>
        </div>

        <div className="login-heading">
          <span className="eyebrow">Acceso seguro</span>
          <h1>Bienvenido de nuevo</h1>
          <p>Ingrese sus credenciales para administrar el catálogo.</p>
        </div>

        <form className="login-form" onSubmit={submit} noValidate>
          <label className="field">
            <span>Usuario</span>
            <input
              autoComplete="username"
              value={credentials.usuario}
              onChange={(event) => setCredentials({ ...credentials, usuario: event.target.value })}
              placeholder="admin"
              disabled={loading}
            />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              value={credentials.password}
              onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
              placeholder="Ingrese su contraseña"
              disabled={loading}
            />
          </label>

          {error && <div className="form-alert" role="alert">{error}</div>}

          <button className="button button--primary button--wide" type="submit" disabled={loading}>
            {loading ? 'Verificando…' : 'Iniciar sesión'}
            {!loading && <Icon name="arrow" />}
          </button>
        </form>

        <p className="login-note">La sesión se conserva únicamente mientras esta pestaña permanezca abierta.</p>
      </section>
      <aside className="login-visual" aria-hidden="true">
        <div className="road-lines" />
        <div className="login-visual__copy">
          <span>Gestión centralizada</span>
          <strong>Inventario y categorías en una sola vista.</strong>
        </div>
      </aside>
    </main>
  )
}
