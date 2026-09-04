const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const SESSION_KEY = 'vehiculos_session'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getSession() {
  const value = sessionStorage.getItem(SESSION_KEY)
  if (!value) return null

  try {
    const session = JSON.parse(value)
    if (!session.token || isTokenExpired(session.token)) {
      clearSession()
      return null
    }
    return session
  } catch {
    clearSession()
    return null
  }
}

export function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

function isTokenExpired(token) {
  try {
    let encodedPayload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    encodedPayload += '='.repeat((4 - (encodedPayload.length % 4)) % 4)
    const payload = JSON.parse(atob(encodedPayload))
    return !payload.exp || payload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

function getErrorMessage(payload, status) {
  if (typeof payload === 'string' && payload.trim()) return payload
  if (payload?.errors) return Object.values(payload.errors).flat().join(' ')
  if (payload?.title) return payload.title
  return `No fue posible completar la solicitud (${status}).`
}

async function request(path, options = {}) {
  const session = getSession()
  const headers = new Headers(options.headers)

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`)
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new ApiError('No se pudo conectar con el API Gateway.', 0)
  }

  if (response.status === 401) {
    clearSession()
    window.dispatchEvent(new Event('auth:unauthorized'))
    throw new ApiError('La sesión expiró. Inicie sesión nuevamente.', 401)
  }

  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    throw new ApiError(getErrorMessage(payload, response.status), response.status)
  }

  return payload
}

export const api = {
  login: (credentials) => request('/api/Auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  vehiculos: {
    list: () => request('/api/Vehiculos'),
    get: (id) => request(`/api/Vehiculos/${id}`),
    create: (vehiculo) => request('/api/Vehiculos', {
      method: 'POST',
      body: JSON.stringify(vehiculo),
    }),
    update: (id, vehiculo) => request(`/api/Vehiculos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vehiculo),
    }),
    remove: (id) => request(`/api/Vehiculos/${id}`, { method: 'DELETE' }),
  },
  categorias: {
    list: () => request('/api/Categorias'),
    get: (id) => request(`/api/Categorias/${id}`),
    create: (categoria) => request('/api/Categorias', {
      method: 'POST',
      body: JSON.stringify(categoria),
    }),
    update: (id, categoria) => request(`/api/Categorias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoria),
    }),
    remove: (id) => request(`/api/Categorias/${id}`, { method: 'DELETE' }),
  },
}

export { API_URL }
