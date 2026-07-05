import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { universityApi, applicationApi } from '../../lib/api'
import { useLocale } from '../../hooks/useLocale'
import { StepProgress, FormField, Alert, Card, Spinner } from '../../components/ui'
import { ChevronRight, Loader2 } from 'lucide-react'

const STEPS = ['University', 'Details', 'Review']

interface AppForm {
  universityId: string; programId: string; tuitionAmount: string
  requestedAmount: string; academicYear: string
}

export default function NewApplicationPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<AppForm>({
    universityId: '', programId: '', tuitionAmount: '',
    requestedAmount: '', academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')

  const { data: universities, isLoading: unisLoading } = useQuery({
    queryKey: ['unis-public'],
    queryFn: () => universityApi.list().then(r => r.data.data || []),
  })

  const { data: programs } = useQuery({
    queryKey: ['programs', form.universityId],
    queryFn: () => universityApi.getPrograms(form.universityId).then(r => r.data),
    enabled: !!form.universityId,
  })

  const selectedUni = universities?.find((u: any) => u.id === form.universityId)
  const selectedProg = programs?.find((p: any) => p.id === form.programId)

  const mutation = useMutation({
    // T-207 — no studentId here: POST /applications/me resolves it
    // server-side from the JWT identity. (This used to send `user!.id` —
    // the auth user's id, not the actual students.id row — which was
    // always the wrong value anyway; harmless since the backend now
    // ignores any client-supplied studentId regardless.)
    mutationFn: () => applicationApi.create({
      universityId: form.universityId,
      programId: form.programId || undefined,
      tuitionAmount: parseFloat(form.tuitionAmount),
      requestedSupportAmount: form.requestedAmount ? parseFloat(form.requestedAmount) : parseFloat(form.tuitionAmount),
      currency: 'TND',
      academicYear: form.academicYear,
      isRenewal: false,
    }),
    onSuccess: () => navigate('/application'),
    onError: (err: any) => setServerError(err?.response?.data?.message || 'Submission failed. Please try again.'),
  })

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {}
    if (s === 0 && !form.universityId) e.universityId = 'Please select a university'
    if (s === 1) {
      if (!form.tuitionAmount || parseFloat(form.tuitionAmount) <= 0) e.tuitionAmount = 'Enter a valid amount'
      if (!form.academicYear) e.academicYear = 'Required'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => { if (validate(step)) setStep(s => s + 1) }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="section-title">{t('applyTitle')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('applySubtitle')}</p>
      </div>

      <StepProgress steps={STEPS} current={step} />

      {serverError && <Alert type="error" message={serverError} onClose={() => setServerError('')} />}

      {/* Step 0 — University */}
      {step === 0 && (
        <div className="space-y-4">
          {errors.universityId && <Alert type="error" message={errors.universityId} />}
          {unisLoading ? <Spinner className="h-40" /> : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">{t('selectUniversity')}</p>
              {(universities || []).map((u: any) => (
                <button key={u.id} onClick={() => setForm(f => ({ ...f, universityId: u.id, programId: '' }))}
                  className={`w-full p-4 rounded-2xl border-2 text-start transition-all ${
                    form.universityId === u.id
                      ? 'border-navy-800 bg-navy-50'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-navy-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-navy-700 font-bold">{u.name[0]}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.city} · {u.short_name}</p>
                    </div>
                    {form.universityId === u.id && (
                      <div className="ms-auto w-5 h-5 bg-navy-800 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
              {(universities || []).length === 0 && (
                <div className="text-center py-8 text-sm text-gray-400">No partner universities available yet.</div>
              )}
            </div>
          )}

          {/* Program selection */}
          {form.universityId && programs && programs.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">{t('selectProgram')}</p>
              {programs.map((p: any) => (
                <button key={p.id} onClick={() => setForm(f => ({ ...f, programId: p.id }))}
                  className={`w-full p-3 rounded-xl border-2 text-start transition-all ${
                    form.programId === p.id ? 'border-teal-500 bg-teal-50' : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.level} · {p.duration_years} years · {parseFloat(p.tuition_min || 0).toLocaleString()}–{parseFloat(p.tuition_max || 0).toLocaleString()} TND</p>
                </button>
              ))}
            </div>
          )}

          <button onClick={next} disabled={!form.universityId} className="btn-primary w-full py-3">
            {t('next')} <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Step 1 — Details */}
      {step === 1 && (
        <div className="space-y-4">
          <FormField label={t('tuitionAmount')} required error={errors.tuitionAmount} hint="Annual tuition in TND">
            <div className="relative">
              <input type="number" className="input pe-16" value={form.tuitionAmount}
                onChange={e => setForm(f => ({ ...f, tuitionAmount: e.target.value }))}
                placeholder="3500" min="100" />
              <span className="absolute end-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">TND</span>
            </div>
          </FormField>

          <FormField label={t('requestedAmount')} hint="Leave blank to request full tuition amount">
            <div className="relative">
              <input type="number" className="input pe-16" value={form.requestedAmount}
                onChange={e => setForm(f => ({ ...f, requestedAmount: e.target.value }))}
                placeholder={form.tuitionAmount || '3500'} min="0" />
              <span className="absolute end-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">TND</span>
            </div>
          </FormField>

          <FormField label={t('academicYear')} required error={errors.academicYear} hint="e.g. 2026-2027">
            <input className="input" value={form.academicYear}
              onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} />
          </FormField>

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="btn-secondary flex-1 py-3">{t('back')}</button>
            <button onClick={next} className="btn-primary flex-1 py-3">{t('next')} <ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* Step 2 — Review */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Application Summary</p>
            <div className="space-y-3">
              {[
                { label: 'University', value: selectedUni?.name || '—' },
                { label: 'Program', value: selectedProg?.name || 'Not selected' },
                { label: 'Tuition Amount', value: `${parseFloat(form.tuitionAmount || '0').toLocaleString()} TND` },
                { label: 'Requested', value: form.requestedAmount ? `${parseFloat(form.requestedAmount).toLocaleString()} TND` : 'Full amount' },
                { label: 'Academic Year', value: form.academicYear },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="bg-navy-50 border border-navy-100 rounded-xl p-4">
            <p className="text-sm text-navy-700">
              By submitting, you confirm that all information provided is accurate and complete. FORSA will review your application and contact you within 5–7 business days.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-3">{t('back')}</button>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-teal flex-1 py-3">
              {mutation.isPending ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : t('submit')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
