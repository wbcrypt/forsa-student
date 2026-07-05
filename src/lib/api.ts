import axios from 'axios'

const TENANT_ID = import.meta.env.VITE_TENANT_ID || 'be694fc0-789a-4dec-b514-850710469c72'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '') + '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('student_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
let isRefreshing = false
let queue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null = null) => {
  queue.forEach(p => error ? p.reject(error) : p.resolve(token!))
  queue = []
}

api.interceptors.response.use(
  r => r,
  async (error) => {
    const req = error.config as any
    if (error.response?.status === 401 && !req._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }))
          .then(token => { req.headers.Authorization = `Bearer ${token}`; return api(req) })
      }
      req._retry = true
      isRefreshing = true
      const refresh = localStorage.getItem('student_refresh')
      if (!refresh) { localStorage.clear(); window.location.href = '/login'; return Promise.reject(error) }
      try {
        const res = await axios.post('/api/v1/auth/refresh', { refreshToken: refresh })
        const { accessToken, refreshToken: newRefresh } = res.data
        localStorage.setItem('student_token', accessToken)
        localStorage.setItem('student_refresh', newRefresh)
        processQueue(null, accessToken)
        req.headers.Authorization = `Bearer ${accessToken}`
        return api(req)
      } catch (err) {
        processQueue(err, null)
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(err)
      } finally { isRefreshing = false }
    }
    return Promise.reject(error)
  }
)

export default api
export { TENANT_ID }

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password, tenantId: TENANT_ID }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

// ─── Student (self) ───────────────────────────────────────────────────────────
export const studentApi = {
  getMe: (id: string) => api.get(`/students/${id}`),
  update: (id: string, data: unknown) => api.patch(`/students/${id}`, data),
  getScore: (id: string) => api.get(`/scores/students/${id}`),
  getApplications: (id: string) => api.get(`/students/${id}/applications`),
  getPayments: (id: string) => api.get(`/students/${id}/payments`),
}

// ─── Applications ─────────────────────────────────────────────────────────────
export const applicationApi = {
  create: (data: unknown) => api.post('/applications', data),
  get: (id: string) => api.get(`/applications/${id}`),
  getStatusHistory: (id: string) => api.get(`/applications/${id}/status-history`),
}

// ─── Universities ─────────────────────────────────────────────────────────────
export const universityApi = {
  list: () => api.get('/universities', { params: { limit: 100, status: 'active' } }),
  getPrograms: (id: string) => api.get(`/universities/${id}/programs`),
}

// ─── Documents ────────────────────────────────────────────────────────────────
export const documentApi = {
  getChecklist: (applicationId: string) =>
    api.get(`/documents/checklist/applications/${applicationId}`),
  getUploadUrl: (data: unknown) => api.post('/documents/upload-url', data),
  confirmUpload: (id: string, fileSize: number) =>
    api.post(`/documents/${id}/confirm-upload`, { fileSize }),
  getForEntity: (type: string, id: string) =>
    api.get(`/documents/entity/${type}/${id}`),
}

// T-111: real S3 upload — PUT the raw file bytes to the pre-signed URL returned
// by `documentApi.getUploadUrl`. Deliberately uses a bare `axios` call (not the
// `api` instance above): the pre-signed URL already carries its own auth
// (SigV4 query params), and the `api` instance would otherwise prepend our own
// baseURL/`/api/v1` prefix and attach our Bearer token — both wrong for a
// direct-to-S3 PUT.
export function uploadFileToS3(uploadUrl: string, file: File) {
  return axios.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type },
  })
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export const paymentApi = {
  getSchedule: (applicationId: string) =>
    api.get(`/payments/schedules/applications/${applicationId}`),
}
