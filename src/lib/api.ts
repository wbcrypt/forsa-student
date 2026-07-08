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
  // Phase 2 D-001/T-204 — consumes the one-time token emailed on
  // membership approval; the account is provisioned with an unusable
  // placeholder password until this is called.
  setPassword: (token: string, newPassword: string) =>
    api.post('/auth/set-password', { token, newPassword }),
}

// ─── Membership (Phase 2 T-203) — public, no auth ─────────────────────────────
export const membershipApi = {
  create: (data: {
    firstName: string; lastName: string; phone: string; email: string; city: string
    universityId?: string; programme: string; academicYear: string
    currentOrFutureStudent: 'current' | 'future'
  }) => api.post('/membership-requests', { ...data, tenantId: TENANT_ID }),
}

// ─── Student (self) ───────────────────────────────────────────────────────────
export const studentApi = {
  // Phase 3 (browser E2E testing) discovery — getMe/getApplications
  // called GET /students/:id and GET /students/:id/applications with
  // user.id (the auth user's own account id, not the actual students.id
  // row) — both are staff-only (student.view). Every real student's
  // home page has 403'd on both calls since this page was first built,
  // silently falling through to placeholder values. Fixed to the
  // self-scoped routes, which take no id at all (resolved server-side
  // from the JWT identity).
  getMe: () => api.get('/students/me'),
  update: (id: string, data: unknown) => api.patch(`/students/${id}`, data),
  getScore: (id: string) => api.get(`/scores/students/${id}`),
  getApplications: () => api.get('/students/me/applications'),
  // T-219 — was studentApi.getPayments(id), which hits GET /students/:id/payments,
  // a staff-only route (@RequirePermissions('payment.view')) that a student
  // portal user 403s on. This calls the new self-scoped GET /students/me/payments
  // instead, which resolves the student id server-side from the JWT identity and
  // spans every payment across every application/financing period, not just one.
  getMyPayments: () => api.get('/students/me/payments'),
  // Phase 10 — self-service guarantor invitation, no staff action required.
  addGuarantor: (data: { firstName: string; lastName: string; email: string; relationship?: string; phone?: string }) =>
    api.post('/students/me/guarantors', data),
  resendGuarantorInvite: (guarantorId: string) => api.post(`/students/me/guarantors/${guarantorId}/resend-invite`),
}

// ─── Digital Student Pass (Phase 2 T-205/T-206) ───────────────────────────────
export const digitalPassApi = {
  getMine: () => api.get('/students/me/digital-pass'),
}

// ─── Applications ─────────────────────────────────────────────────────────────
export const applicationApi = {
  // T-207 — was POST /applications (@RequirePermissions('application.create'),
  // a staff-only CRM permission a self-registered student never holds — no
  // role is ever assigned to those accounts — so this was silently 403ing
  // for every real student). POST /applications/me resolves the student
  // server-side from the JWT identity and is gated on active Bronze+
  // membership (D-004) instead of a staff permission.
  create: (data: unknown) => api.post('/applications/me', data),
  get: (id: string) => api.get(`/applications/${id}`),
  // Phase 3 (browser E2E testing) discovery — called the staff-only
  // GET /applications/:id/status-history (application.view), 403ing for
  // every real student. Self-scoped: verifies the caller owns this
  // application server-side.
  getStatusHistory: (id: string) => api.get(`/applications/me/${id}/status-history`),
  // Phase 10 — Waiting List Experience.
  getQueuePosition: (id: string) => api.get(`/applications/me/${id}/queue-position`),
}

// ─── Universities ─────────────────────────────────────────────────────────────
export const universityApi = {
  // Phase 3 (browser E2E testing) discovery — list()/getPrograms() called
  // the staff-only GET /universities and GET /:id/programs
  // (university.view) — every real student's Financing Request form
  // (ApplyPage.tsx) has had empty university/program dropdowns since it
  // was built, since both calls silently 403'd. Fixed to the public,
  // minimal-projection routes (no auth, same pattern already used
  // correctly by the Membership Request form below).
  list: () => api.get('/universities/public', { params: { tenantId: TENANT_ID } }),
  getPrograms: (id: string) => api.get(`/universities/${id}/programs/public`, { params: { tenantId: TENANT_ID } }),
  // Phase 2 T-203 — public, no auth (for the anonymous Membership Request
  // form). GET /universities requires a staff permission and would 403 here.
  listPublic: () => api.get('/universities/public', { params: { tenantId: TENANT_ID } }),
}

// ─── Documents ────────────────────────────────────────────────────────────────
export const documentApi = {
  getChecklist: (applicationId: string) =>
    api.get(`/documents/checklist/applications/${applicationId}`),
  // Phase 3 (browser E2E testing) discovery — called the staff-only
  // POST /documents/upload-url and /documents/:id/confirm-upload
  // (document.upload), 403ing for every real student's payment-receipt
  // upload since PaymentsPage.tsx was built. Self-scoped: the server
  // forces entityType='student' and resolves the caller's own
  // students.id — entityType/entityId in the request body are ignored.
  getUploadUrl: (data: unknown) => api.post('/documents/me/upload-url', data),
  confirmUpload: (id: string, fileSize: number) =>
    api.post(`/documents/me/${id}/confirm-upload`, { fileSize }),
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
  // Phase 3 (browser E2E testing) discovery — called the staff-only
  // GET /payments/schedules/applications/:id (payment.view) directly —
  // every real student's payment schedule/next-due view 403'd. Fixed to
  // the self-scoped route, which verifies ownership server-side.
  getSchedule: (applicationId: string) =>
    api.get(`/payments/schedules/me/applications/${applicationId}`),
}
