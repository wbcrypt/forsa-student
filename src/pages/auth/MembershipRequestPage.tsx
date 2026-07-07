// Phase 2 T-203 — genuinely public Membership Request intake (Visitor ->
// Membership Request). Deliberately minimal: no password, no guarantor, no
// financial documents at this stage — those are Financing Request scope,
// reachable only after Bronze membership already exists (see D-004).
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useLocale } from '../../hooks/useLocale'
import { LOCALES, Locale } from '../../lib/i18n'
import { Alert, FormField } from '../../components/ui'
import { Loader2, CheckCircle } from 'lucide-react'
import { membershipApi, universityApi } from '../../lib/api'

interface ReqForm {
  firstName: string; lastName: string; email: string; phone: string
  city: string; universityId: string; programme: string; academicYear: string
  currentOrFutureStudent: 'current' | 'future'
}

function validate(form: ReqForm): Record<string, string> {
  const e: Record<string, string> = {}
  if (!form.firstName.trim()) e.firstName = 'Required'
  if (!form.lastName.trim()) e.lastName = 'Required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
  if (!form.phone.trim()) e.phone = 'Required'
  if (!form.city.trim()) e.city = 'Required'
  if (!form.programme.trim()) e.programme = 'Required'
  if (!form.academicYear.trim()) e.academicYear = 'Required'
  return e
}

export default function MembershipRequestPage() {
  const { t, locale, changeLocale } = useLocale()
  const navigate = useNavigate()
  const [form, setForm] = useState<ReqForm>({
    firstName: '', lastName: '', email: '', phone: '',
    city: '', universityId: '', programme: '', academicYear: '2026-2027',
    currentOrFutureStudent: 'current',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const { data: universities } = useQuery({
    queryKey: ['universities-public'],
    queryFn: () => universityApi.listPublic().then(r => r.data),
  })

  const set = (field: keyof ReqForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const submit = async () => {
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true); setServerError('')
    try {
      await membershipApi.create({
        firstName: form.firstName, lastName: form.lastName, email: form.email,
        phone: form.phone, city: form.city, universityId: form.universityId || undefined,
        programme: form.programme, academicYear: form.academicYear,
        currentOrFutureStudent: form.currentOrFutureStudent,
      })
      setDone(true)
    } catch (err: any) {
      const fieldErrors: string[] | undefined = err?.response?.data?.errors
      const message = Array.isArray(fieldErrors) && fieldErrors.length > 0
        ? fieldErrors.join(' ')
        : err?.response?.data?.message || 'Submission failed. Please try again.'
      setServerError(message)
    } finally { setLoading(false) }
  }

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex flex-col items-center justify-center px-5 text-center">
      <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mb-5">
        <CheckCircle size={40} className="text-green-500" />
      </div>
      <h1 className="text-white text-2xl font-bold mb-2">Membership Request Submitted!</h1>
      <p className="text-white/60 text-sm max-w-sm mb-6">
        Our team will review your request. Once approved, you'll receive an email with a link to
        set your password and access your FORSA account as a Bronze member.
      </p>
      <Link to="/login" className="btn-teal py-3 px-8">Return to Sign In</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex flex-col">
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="FORSA" className="w-8 h-8 object-contain" />
          <span className="text-white font-semibold">FORSA</span>
        </div>
        <div className="flex gap-1 bg-white/10 rounded-xl p-1">
          {LOCALES.map(l => (
            <button key={l.code} onClick={() => changeLocale(l.code as Locale)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                locale === l.code ? 'bg-white text-navy-900' : 'text-white/70 hover:text-white'
              }`}>
              {l.code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-white text-2xl font-bold">Join FORSA</h1>
            <p className="text-white/60 text-sm mt-1">
              Every applicant becomes part of the FORSA community. Start with a Membership Request —
              no guarantor or financial documents needed yet.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-modal p-6 space-y-4">
            {serverError && <Alert type="error" message={serverError} onClose={() => setServerError('')} />}

            <div className="grid grid-cols-2 gap-3">
              <FormField label="First Name" required error={errors.firstName}>
                <input className="input" value={form.firstName} onChange={set('firstName')} placeholder="Amina" />
              </FormField>
              <FormField label="Last Name" required error={errors.lastName}>
                <input className="input" value={form.lastName} onChange={set('lastName')} placeholder="Trabelsi" />
              </FormField>
            </div>
            <FormField label="Email Address" required error={errors.email}>
              <input type="email" className="input" value={form.email} onChange={set('email')} placeholder="you@email.com" />
            </FormField>
            <FormField label="Phone" required error={errors.phone}>
              <input className="input" value={form.phone} onChange={set('phone')} placeholder="+216 20 000 000" />
            </FormField>
            <FormField label="City" required error={errors.city}>
              <input className="input" value={form.city} onChange={set('city')} placeholder="Tunis" />
            </FormField>
            <FormField label="University">
              <select className="input" value={form.universityId} onChange={set('universityId')}>
                <option value="">Select your university</option>
                {(universities || []).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}{u.city ? ` — ${u.city}` : ''}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Programme" required error={errors.programme}>
              <input className="input" value={form.programme} onChange={set('programme')} placeholder="Computer Science" />
            </FormField>
            <FormField label="Academic Year" required error={errors.academicYear}>
              <input className="input" value={form.academicYear} onChange={set('academicYear')} placeholder="2026-2027" />
            </FormField>
            <FormField label="Student Status" required>
              <select className="input" value={form.currentOrFutureStudent} onChange={set('currentOrFutureStudent')}>
                <option value="current">Currently enrolled</option>
                <option value="future">Planning to enroll</option>
              </select>
            </FormField>

            <button onClick={submit} disabled={loading} className="btn-teal w-full py-3">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Submitting…' : 'Submit Membership Request'}
            </button>
          </div>

          <p className="text-center text-white/50 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-400 hover:text-teal-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
