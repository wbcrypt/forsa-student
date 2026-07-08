import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentApi } from '../../lib/api'
import { useLocale } from '../../hooks/useLocale'
import { Card, Spinner, Alert, FormField } from '../../components/ui'
import { UserPlus, CheckCircle, Clock, XCircle, Mail } from 'lucide-react'

// Phase 10 — closes the pilot blocker documented in FORSA_OPERATIONS_MANUAL.md:
// the Apply wizard's "do you have a guarantor?" question never led anywhere.
// This page is the real workflow that question was missing — a student can
// invite their own guarantor here, at any time, with no staff action needed.
export default function GuarantorPage() {
  const { locale } = useLocale()
  const qc = useQueryClient()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', relationship: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { data: student, isLoading } = useQuery({
    queryKey: ['student-me-guarantor'],
    queryFn: () => studentApi.getMe().then(r => r.data),
  })

  const guarantors: any[] = (student?.guarantors || []).filter((g: any) => g && g.id)

  const addMutation = useMutation({
    mutationFn: () => studentApi.addGuarantor(form),
    onSuccess: () => {
      setSuccess(true)
      setForm({ firstName: '', lastName: '', email: '', relationship: '' })
      qc.invalidateQueries({ queryKey: ['student-me-guarantor'] })
      qc.invalidateQueries({ queryKey: ['student-me'] })
    },
    onError: (err: any) => setError(err?.response?.data?.message || (
      locale === 'ar' ? 'تعذر إرسال الدعوة. حاول مرة أخرى.' : locale === 'fr' ? "Échec de l'envoi de l'invitation. Réessayez." : 'Failed to send the invitation. Please try again.'
    )),
  })

  const resendMutation = useMutation({
    mutationFn: (guarantorId: string) => studentApi.resendGuarantorInvite(guarantorId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-me-guarantor'] }),
  })

  const handleSubmit = () => {
    setError('')
    if (!form.firstName || !form.lastName || !form.email) {
      setError(locale === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : locale === 'fr' ? 'Veuillez remplir tous les champs obligatoires' : 'Please fill all required fields')
      return
    }
    addMutation.mutate()
  }

  if (isLoading) return <Spinner className="h-64" />

  return (
    <div className="space-y-5">
      <h1 className="section-title">
        {locale === 'ar' ? 'الضامن' : locale === 'fr' ? 'Garant' : 'Guarantor'}
      </h1>

      {guarantors.length > 0 && (
        <div className="space-y-3">
          {guarantors.map((g: any) => (
            <GuarantorStatusCard key={g.id} guarantor={g} locale={locale}
              onResend={() => resendMutation.mutate(g.guarantorId)}
              resending={resendMutation.isPending} />
          ))}
        </div>
      )}

      {!guarantors.some((g: any) => g.status === 'active' || g.status === 'pending_invitation') && (
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <UserPlus size={16} className="text-navy-700" />
            <p className="text-sm font-semibold text-gray-900">
              {locale === 'ar' ? 'دعوة ضامن' : locale === 'fr' ? 'Inviter un garant' : 'Invite a guarantor'}
            </p>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {locale === 'ar' ? 'أضف الشخص الذي سيدعم خطة تيسير المعاليم الجامعية الخاصة بك. سيتلقى رابط دعوة آمن عبر البريد الإلكتروني.' : locale === 'fr' ? "Ajoutez la personne qui soutiendra votre plan de facilitation des frais universitaires. Elle recevra un lien d'invitation sécurisé par e-mail." : "Add the person who will back your Tuition Facilitation Plan. They'll receive a secure invitation link by email."}
          </p>

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-2">
              <CheckCircle size={15} className="text-green-500" />
              <p className="text-sm text-green-700">
                {locale === 'ar' ? 'تم إرسال الدعوة بنجاح' : locale === 'fr' ? 'Invitation envoyée avec succès' : 'Invitation sent successfully'}
              </p>
            </div>
          )}
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label={locale === 'ar' ? 'الاسم الأول' : locale === 'fr' ? 'Prénom' : 'First name'} required>
                <input className="input" value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
              </FormField>
              <FormField label={locale === 'ar' ? 'اسم العائلة' : locale === 'fr' ? 'Nom' : 'Last name'} required>
                <input className="input" value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </FormField>
            </div>
            <FormField label={locale === 'ar' ? 'البريد الإلكتروني' : locale === 'fr' ? 'E-mail' : 'Email'} required>
              <input type="email" className="input" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </FormField>
            <FormField label={locale === 'ar' ? 'صلة القرابة' : locale === 'fr' ? 'Lien de parenté' : 'Relationship'}>
              <input className="input" value={form.relationship}
                placeholder={locale === 'ar' ? 'مثال: الأب، الأم' : locale === 'fr' ? 'ex: Parent' : 'e.g. Parent'}
                onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))} />
            </FormField>
            <button onClick={handleSubmit} disabled={addMutation.isPending} className="btn-teal w-full">
              {addMutation.isPending
                ? (locale === 'ar' ? 'جارٍ الإرسال...' : locale === 'fr' ? 'Envoi...' : 'Sending...')
                : (locale === 'ar' ? 'إرسال الدعوة' : locale === 'fr' ? "Envoyer l'invitation" : 'Send Invitation')}
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}

function GuarantorStatusCard({ guarantor, locale, onResend, resending }: {
  guarantor: any; locale: string; onResend: () => void; resending: boolean
}) {
  const status = guarantor.status as string
  const config: Record<string, { icon: any; color: string; label: Record<string, string> }> = {
    pending_invitation: {
      icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-200',
      label: { en: 'Invitation Pending', fr: "Invitation en attente", ar: 'الدعوة قيد الانتظار' },
    },
    active: {
      icon: CheckCircle, color: 'bg-teal-50 text-teal-700 border-teal-200',
      label: { en: 'Active', fr: 'Actif', ar: 'نشط' },
    },
    declined: {
      icon: XCircle, color: 'bg-red-50 text-red-600 border-red-200',
      label: { en: 'Declined', fr: 'Refusé', ar: 'مرفوض' },
    },
  }
  const c = config[status] || config.pending_invitation
  const Icon = c.icon

  return (
    <Card className={c.color}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0">
            <Icon size={16} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{guarantor.fullName}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Mail size={11} />{guarantor.email}</p>
            <p className="text-xs font-medium mt-1.5">{c.label[locale] || c.label.en}</p>
          </div>
        </div>
      </div>
      {status === 'pending_invitation' && (
        <button onClick={onResend} disabled={resending}
          className="text-xs font-semibold text-navy-700 mt-3 underline disabled:opacity-50">
          {resending
            ? (locale === 'ar' ? 'جارٍ إعادة الإرسال...' : locale === 'fr' ? 'Renvoi...' : 'Resending...')
            : (locale === 'ar' ? 'إعادة إرسال الدعوة' : locale === 'fr' ? "Renvoyer l'invitation" : 'Resend Invitation')}
        </button>
      )}
      {status === 'declined' && (
        <p className="text-xs text-gray-500 mt-3">
          {locale === 'ar' ? 'يمكنك دعوة ضامن آخر أدناه.' : locale === 'fr' ? "Vous pouvez inviter un autre garant ci-dessous." : 'You can invite a different guarantor below.'}
        </p>
      )}
    </Card>
  )
}
