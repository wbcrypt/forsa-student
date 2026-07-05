// Phase 2 D-001/T-204 — consumes the one-time set-password token emailed on
// membership approval. The account is provisioned with an unusable
// placeholder password (never a real invented one) until this runs.
import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Alert, FormField } from '../../components/ui'
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { authApi } from '../../lib/api'

export default function SetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (password.length < 12) { setError('Password must be at least 12 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true); setError('')
    try {
      await authApi.setPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'This link is invalid or has expired.')
    } finally { setLoading(false) }
  }

  if (!token) return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex flex-col items-center justify-center px-5 text-center">
      <Alert type="error" message="This set-password link is missing its token. Please use the link from your email." />
      <Link to="/login" className="text-teal-400 hover:text-teal-300 font-medium mt-4">Return to Sign In</Link>
    </div>
  )

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex flex-col items-center justify-center px-5 text-center">
      <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mb-5">
        <CheckCircle size={40} className="text-green-500" />
      </div>
      <h1 className="text-white text-2xl font-bold mb-2">Password Set!</h1>
      <p className="text-white/60 text-sm">Redirecting you to sign in…</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-white text-2xl font-bold">Welcome to FORSA</h1>
          <p className="text-white/60 text-sm mt-1">Set your password to access your Bronze member account.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-modal p-6 space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          <FormField label="New Password" required hint="At least 12 characters, with uppercase, lowercase, digit, and special character">
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className="input pr-11"
                value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </FormField>
          <FormField label="Confirm Password" required>
            <input type={showPw ? 'text' : 'password'} className="input"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••••••" />
          </FormField>

          <button onClick={submit} disabled={loading} className="btn-teal w-full py-3">
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Setting password…' : 'Set Password'}
          </button>
        </div>
      </div>
    </div>
  )
}
