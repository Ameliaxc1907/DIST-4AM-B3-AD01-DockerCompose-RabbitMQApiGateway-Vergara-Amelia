const API_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
const SESSION_KEY = 'vehiculos_session'
const SESSION_NOTICE_KEY = 'vehiculos_session_notice'
export const SESSION_EXPIRED_MESSAGE = 'La sesión expiró. Inicie sesión nuevamente.'
const VALID_ROLES = new Set(['Admin', 'User'])

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
    if (!isTokenValid(session.token)) {
      invalidateStoredSession()
      return null
    }
    const identity = getTokenIdentity(session.token)
    return {
      token: session.token,
      usuario: identity.usuario,
      rol: identity.rol,
      exp: identity.exp,
    }
  } catch {
    invalidateStoredSession()
    return null
  }
}

export function saveSession(session) {
  if (!isTokenValid(session?.token)) {
    invalidateStoredSession()
    throw new ApiError(SESSION_EXPIRED_MESSAGE, 401)
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  sessionStorage.removeItem(SESSION_NOTICE_KEY)
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_NOTICE_KEY)
}

export function consumeSessionNotice() {
  const message = sessionStorage.getItem(SESSION_NOTICE_KEY) || ''
  sessionStorage.removeItem(SESSION_NOTICE_KEY)
  return message
}

function invalidateStoredSession(notify = false) {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.setItem(SESSION_NOTICE_KEY, SESSION_EXPIRED_MESSAGE)
  if (notify) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized', {
      detail: { message: SESSION_EXPIRED_MESSAGE },
    }))
  }
}

export function invalidateSession() {
  invalidateStoredSession(true)
}

export function decodeToken(token) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3 || parts.some((part) => !part)) return null

  try {
    let encodedPayload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    encodedPayload += '='.repeat((4 - (encodedPayload.length % 4)) % 4)
    const payload = JSON.parse(atob(encodedPayload))
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    return null
  }
}

export function getTokenIdentity(token) {
  const payload = decodeToken(token)
  if (!payload) return { usuario: '', rol: '', exp: 0 }

  return {
    usuario: payload.username
      || payload.unique_name
      || payload.name
      || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
      || '',
    rol: payload.role
      || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
      || '',
    exp: Number(payload.exp) || 0,
  }
}

export function isTokenExpired(token) {
  const { exp } = getTokenIdentity(token)
  return !Number.isFinite(exp) || exp <= 0 || exp * 1000 <= Date.now()
}

export function isTokenValid(token) {
  const identity = getTokenIdentity(token)
  return Boolean(identity.usuario)
    && VALID_ROLES.has(identity.rol)
    && !isTokenExpired(token)
}

export function createSession(token) {
  if (!isTokenValid(token)) {
    invalidateStoredSession()
    throw new ApiError(SESSION_EXPIRED_MESSAGE, 401)
  }

  const identity = getTokenIdentity(token)
  return { token, usuario: identity.usuario, rol: identity.rol, exp: identity.exp }
}

export function getCurrentRole(session) {
  return session?.rol || ''
}

export function canWrite(session) {
  return getCurrentRole(session) === 'Admin'
}

export function getRoleLabel(role) {
  if (role === 'Admin') return 'Administrador'
  if (role === 'User') return 'Usuario'
  return ''
}

function getErrorMessage(payload, status) {
  if (typeof payload === 'string' && payload.trim()) return payload
  if (payload?.errors) return Object.values(payload.errors).flat().join(' ')
  if (payload?.title) return payload.title
  return `No fue posible completar la solicitud (${status}).`
}

async function request(path, options = {}) {
  const { requiresAuth = true, ...fetchOptions } = options
  const session = requiresAuth ? getSession() : null
  if (requiresAuth && !session) {
    invalidateSession()
    throw new ApiError(SESSION_EXPIRED_MESSAGE, 401)
  }

  const headers = new Headers(fetchOptions.headers)

  if (fetchOptions.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`)
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers })
  } catch {
    throw new ApiError('No se pudo conectar con el API Gateway.', 0)
  }

  if (response.status === 401) {
    invalidateSession()
    throw new ApiError(SESSION_EXPIRED_MESSAGE, 401)
  }

  if (response.status === 403) {
    throw new ApiError('No tiene permisos para realizar esta acción.', 403)
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
    body: JSON.stringify({ username: credentials.usuario, password: credentials.password }),
    requiresAuth: false,
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
