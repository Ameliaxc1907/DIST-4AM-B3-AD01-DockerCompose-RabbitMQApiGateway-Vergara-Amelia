import { useCallback, useEffect, useRef, useState } from 'react'
import { api, clearSession, getSession, saveSession } from './api/client.js'
import Categorias from './components/Categorias.jsx'
import Dashboard from './components/Dashboard.jsx'
import Layout from './components/Layout.jsx'
import Login from './components/Login.jsx'
import Vehiculos from './components/Vehiculos.jsx'

export default function App() {
  const [session, setSession] = useState(() => getSession())
  const [section, setSection] = useState('dashboard')
  const [vehiculos, setVehiculos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
    setVehiculos([])
    setCategorias([])
    setSection('dashboard')
  }, [])

  const notify = useCallback((message, type = 'success') => {
    window.clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = window.setTimeout(() => setToast(null), 4200)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [vehicleData, categoryData] = await Promise.all([
        api.vehiculos.list(),
        api.categorias.list(),
      ])
      setVehiculos(vehicleData)
      setCategorias(categoryData)
    } catch (error) {
      if (error.status !== 401) notify(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    if (session) loadData()
  }, [session, loadData])

  useEffect(() => {
    window.addEventListener('auth:unauthorized', logout)
    return () => {
      window.removeEventListener('auth:unauthorized', logout)
      window.clearTimeout(toastTimer.current)
    }
  }, [logout])

  const login = async (credentials) => {
    const response = await api.login(credentials)
    const nextSession = { token: response.token, usuario: response.usuario, rol: response.rol }
    saveSession(nextSession)
    setSession(nextSession)
  }

  const refreshAfterCategoryChange = async (waitForRabbit) => {
    await loadData()
    if (waitForRabbit) {
      window.setTimeout(loadData, 1200)
    }
  }

  if (!session) return <Login onLogin={login} />

  return (
    <>
      <Layout activeSection={section} onNavigate={setSection} onLogout={logout} user={session}>
        {section === 'dashboard' && <Dashboard vehiculos={vehiculos} categorias={categorias} loading={loading} onNavigate={setSection} />}
        {section === 'vehiculos' && <Vehiculos items={vehiculos} categorias={categorias} loading={loading} onReload={loadData} notify={notify} />}
        {section === 'categorias' && <Categorias items={categorias} loading={loading} onReload={refreshAfterCategoryChange} notify={notify} />}
      </Layout>
      {toast && <div className={`toast toast--${toast.type}`} role="status">{toast.message}</div>}
    </>
  )
}
