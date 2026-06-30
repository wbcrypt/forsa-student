// Payment Center — traditional payments only (bank transfer + cash deposit)
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { studentApi, paymentApi } from '../../lib/api'
import api from '../../lib/api'
import { Card, Spinner, EmptyState, Alert } from '../../components/ui'
import {
  CreditCard, Copy, Check, Building2, Banknote,
  Upload, Loader2, ChevronDown, ChevronUp, Info, Clock, CheckCircle
} from 'lucide-react'
import { format } from 'date-fns'
import clsx from 'clsx'

function generateRef(applicationId: string, sequence: number): string {
  const year = new Date().getFullYear()
  const appShort = applicationId?.slice(-6).toUpperCase() || '000000'
  const month = String(sequence).padStart(2, '0')
  return `FORSA-${year}-${appShort}-M${month}`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 text-gray-400 hover:text-navy-700 hover:bg-navy-50 rounded-lg transition-colors flex-shrink-0">
      {copied ? <Check size={14} className="text-teal-500" /> : <Copy size={14} />}
    </button>
  )
}


// ─── Konnect online payment ────────────────────────────────────────────────
async function initiateKonnect(
  installmentId: string,
  amount: number,
  reference: string,
  setLoading: (b: boolean) => void,
  setError: (s: string) => void,
) {
  setLoading(true); setError('')
  try {
    const r = await api.post('/payments/konnect/initiate', { installmentId, paymentReference: reference, amount })
    if (r.data.payUrl) {
      window.location.href = r.data.payUrl
    } else {
      setError('Could not initiate Konnect payment. Please try bank transfer instead.')
    }
  } catch (err: any) {
    setError(err?.response?.data?.message || 'Konnect payment failed. Please use bank transfer.')
  } finally { setLoading(false) }
}

function PaymentMethodCard({ icon: Icon, title, badge, children, color }: {
  icon: React.ElementType; title: string; badge?: string; children: React.ReactNode; color: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <Card className={clsx('border-2 transition-all', open ? 'border-navy-300' : 'border-gray-100')}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 text-start">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
          <Icon size={18} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {badge && <p className="text-xs text-gray-400">{badge}</p>}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="mt-4 pt-4 border-t border-gray-100">{children}</div>}
    </Card>
  )
}


function KonnectButton({ installmentId, amount, reference }: { installmentId: string; amount: number; reference: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  return (
    <div>
      {error && <p className="text-xs text-red-200 mb-2">{error}</p>}
      <button
        onClick={() => initiateKonnect(installmentId, amount, reference, setLoading, setError)}
        disabled={loading}
        className="flex items-center gap-2 bg-white text-teal-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-teal-50 transition-colors disabled:opacity-60">
        {loading ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
        {loading ? 'Redirecting to Konnect…' : `Pay ${amount.toLocaleString()} TND with Konnect`}
      </button>
    </div>
  )
}

export default function PaymentsPage() {
  const { user } = useAuth()
  const { t, locale } = useLocale()
  const qc = useQueryClient()

  const { data: applications } = useQuery({
    queryKey: ['student-apps', user?.id],
    queryFn: () => studentApi.getApplications(user!.id).then(r => r.data),
    enabled: !!user?.id,
  })

  const latestApp = applications?.[0]

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedule', latestApp?.id],
    queryFn: () => paymentApi.getSchedule(latestApp!.id).then(r => r.data),
    enabled: !!latestApp?.id,
  })

  const installments = schedule?.installments || []
  const paidCount = installments.filter((i: any) => i.status === 'paid').length
  const totalAmount = parseFloat(schedule?.total_amount || '0')
  const paidAmount = installments.filter((i: any) => i.status === 'paid')
    .reduce((s: number, i: any) => s + parseFloat(i.amount_paid || i.amount || '0'), 0)
  const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0
  const lateCount = installments.filter((i: any) => i.status === 'late' || i.status === 'default_risk').length

  const nextDue = installments.find((i: any) => ['pending', 'due_soon', 'due_today', 'late'].includes(i.status))

  if (!latestApp) return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">{t('paymentCenter')}</h1>
      <EmptyState icon={CreditCard} title={t('noData')}
        description={locale === 'ar' ? 'ستظهر تفاصيل الدفع هنا بعد الموافقة على طلبك.'
          : locale === 'fr' ? "Les détails de paiement apparaîtront ici après l'approbation de votre demande."
          : 'Payment details will appear here after your application is approved.'} />
    </div>
  )

  if (isLoading) return <Spinner className="h-64" />

  if (!schedule) return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">{t('paymentCenter')}</h1>
      <EmptyState icon={CreditCard} title={locale === 'ar' ? 'لا يوجد جدول دفع بعد' : locale === 'fr' ? "Pas encore d'échéancier" : 'No payment schedule yet'}
        description={locale === 'ar' ? 'سيُنشأ جدول الدفع بعد اكتمال اجتماع التفعيل وتوقيع العقد.'
          : locale === 'fr' ? "L'échéancier de paiement sera généré après la réunion d'activation et la signature du contrat."
          : 'The payment schedule will be generated after your activation meeting and contract signing.'} />
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('paymentCenter')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {locale === 'ar' ? 'الدفع عبر التحويل البنكي أو الإيداع النقدي فقط'
            : locale === 'fr' ? 'Paiement par virement bancaire ou dépôt en espèces uniquement'
            : 'Payment by bank transfer or cash deposit only'}
        </p>
      </div>

      {/* Summary */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              {locale === 'ar' ? 'إجمالي المبلغ' : locale === 'fr' ? 'Montant total' : 'Total amount'}
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {totalAmount.toLocaleString()}
              <span className="text-sm font-normal text-gray-400 ms-1">{schedule.currency}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">{locale === 'ar' ? 'تم الدفع' : locale === 'fr' ? 'Payé' : 'Paid'}</p>
            <p className="text-xl font-bold text-teal-600">{paidCount}/{schedule.installment_count}</p>
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{paidAmount.toLocaleString()} {schedule.currency} {locale === 'ar' ? 'مدفوع' : locale === 'fr' ? 'payé' : 'paid'}</span>
          <span>{(totalAmount - paidAmount).toLocaleString()} {schedule.currency} {locale === 'ar' ? 'متبقي' : locale === 'fr' ? 'restant' : 'remaining'}</span>
        </div>
      </Card>

      {/* Alerts */}
      {lateCount > 0 && (
        <Alert type="error" message={locale === 'ar'
          ? `لديك ${lateCount} قسط متأخر. يرجى التسوية فوراً لتجنب العقوبات.`
          : locale === 'fr'
          ? `Vous avez ${lateCount} versement(s) en retard. Réglez immédiatement pour éviter des pénalités.`
          : `You have ${lateCount} late installment(s). Please settle immediately to avoid penalties.`} />
      )}

      {/* Next payment */}
      {nextDue && (
        <Card className="border-2 border-teal-200 bg-teal-50/30">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} className="text-teal-600" />
            <p className="text-sm font-semibold text-teal-800">
              {locale === 'ar' ? 'الدفعة القادمة' : locale === 'fr' ? 'Prochain versement' : 'Next payment due'}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {parseFloat(nextDue.amount).toLocaleString()} <span className="text-sm font-normal text-gray-400">{schedule.currency}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {nextDue.due_date ? format(new Date(nextDue.due_date), 'dd MMMM yyyy') : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">{t('installmentRef')}</p>
              <div className="flex items-center gap-1">
                <span className="text-xs font-mono bg-white border border-gray-200 rounded-lg px-2 py-1">
                  {generateRef(latestApp.id, (nextDue.sequence_number || nextDue.sequence || 1))}
                </span>
                <CopyButton text={generateRef(latestApp.id, (nextDue.sequence_number || nextDue.sequence || 1))} />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Konnect — recommended online payment */}
      {nextDue && (
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-teal-200" />
            <span className="text-xs font-bold text-teal-100 uppercase tracking-wide">Recommended · Fastest</span>
          </div>
          <p className="text-base font-bold mb-0.5">Pay online with Konnect</p>
          <p className="text-sm text-teal-100 mb-4">
            Secure payment by card or e-DINAR. Automatically verified — no receipt upload needed.
          </p>
          <KonnectButton
            installmentId={nextDue.id}
            amount={parseFloat(nextDue.amount)}
            reference={generateRef(latestApp.id, (nextDue.sequence_number || nextDue.sequence || 1))}
          />
          <p className="text-xs text-teal-200 mt-2">A small processing fee may apply · Powered by Konnect</p>
        </div>
      )}

      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium">OR pay manually</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* How to pay */}
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-3">{t('howToPay')}</p>

        {/* Bank transfer */}
        <div className="space-y-3">
          <PaymentMethodCard
            icon={Building2}
            title={t('bankTransfer')}
            badge={t('bankTransferDesc')}
            color="bg-blue-50 text-blue-600">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {locale === 'ar' ? 'تفاصيل الحساب' : locale === 'fr' ? 'Détails du compte' : 'Account details'}
              </p>
              {[
                { label: locale === 'ar' ? 'البنك' : locale === 'fr' ? 'Banque' : 'Bank', value: t('forsaBankName') },
                { label: 'RIB', value: t('forsaBankRib') },
                { label: 'IBAN', value: t('forsaBankAccount') },
                { label: locale === 'ar' ? 'المستفيد' : locale === 'fr' ? 'Bénéficiaire' : 'Beneficiary', value: 'FORSA Tunisia' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-gray-800">{item.value}</span>
                    <CopyButton text={item.value} />
                  </div>
                </div>
              ))}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mt-2">
                <p className="text-xs text-blue-700 font-medium mb-2">
                  {t('transferInstructions')}:
                </p>
                <ol className="text-xs text-blue-600 space-y-1">
                  {(locale === 'ar' ? [
                    'قم بتسجيل الدخول إلى تطبيق البنك الخاص بك أو زر الفرع',
                    'أدخل تفاصيل حساب FORSA أعلاه',
                    'أدخل مرجع الدفع الفريد الخاص بك في حقل الملاحظات',
                    'قم بالتحويل والاحتفاظ بالإيصال',
                    'ارفع الإيصال أدناه',
                  ] : locale === 'fr' ? [
                    'Connectez-vous à votre application bancaire ou visitez votre agence',
                    'Entrez les coordonnées du compte FORSA ci-dessus',
                    'Inscrivez votre référence de paiement unique dans le champ motif',
                    'Effectuez le virement et conservez le reçu',
                    'Téléchargez le reçu ci-dessous',
                  ] : [
                    'Log in to your banking app or visit your branch',
                    'Enter the FORSA account details above',
                    'Write your unique payment reference in the notes/motif field',
                    'Complete the transfer and keep the receipt',
                    'Upload the receipt below',
                  ]).map((step, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="font-bold flex-shrink-0">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </PaymentMethodCard>

          {/* Cash deposit */}
          <PaymentMethodCard
            icon={Banknote}
            title={t('cashDeposit')}
            badge={t('cashDepositDesc')}
            color="bg-green-50 text-green-600">
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                <p className="text-xs text-green-700 font-medium mb-2">
                  {t('depositInstructions')}:
                </p>
                <ol className="text-xs text-green-600 space-y-1">
                  {(locale === 'ar' ? [
                    'زر أي فرع من فروع بنك الزيتونة',
                    'اطلب إيداعاً في حساب FORSA Tunisia',
                    'RIB: 20500000001234567890',
                    'أذكر مرجع دفعك الفريد كسبب للإيداع',
                    'احتفظ بإيصال الإيداع وارفعه أدناه',
                  ] : locale === 'fr' ? [
                    "Rendez-vous dans l'agence Banque Zitouna",
                    'Demandez un dépôt sur le compte FORSA Tunisia',
                    'RIB : 20500000001234567890',
                    'Indiquez votre référence de paiement unique comme motif',
                    'Gardez le reçu de dépôt et téléchargez-le ci-dessous',
                  ] : [
                    'Visit any Zitouna Bank branch',
                    'Request a cash deposit to FORSA Tunisia account',
                    'RIB: 20500000001234567890',
                    'State your unique payment reference as the deposit reason',
                    'Keep the deposit receipt and upload it below',
                  ]).map((step, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="font-bold flex-shrink-0">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </PaymentMethodCard>
        </div>
      </div>

      {/* Upload receipt */}
      <ReceiptUpload
        installments={installments}
        applicationId={latestApp.id}
        currency={schedule.currency}
        t={t} locale={locale}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['schedule', latestApp.id] })}
      />

      {/* Installments list */}
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-3">
          {locale === 'ar' ? 'جدول الأقساط' : locale === 'fr' ? 'Tableau des échéances' : 'Installment Schedule'}
        </p>
        <div className="space-y-2">
          {installments.map((inst: any) => {
            const isPaid = inst.status === 'paid'
            const isLate = inst.status === 'late' || inst.status === 'default_risk'
            const ref = generateRef(latestApp.id, inst.sequence_number || inst.sequence || 1)
            return (
              <Card key={inst.id} className={clsx(
                isLate ? 'border-red-200 bg-red-50/30' : isPaid ? 'border-green-100' : ''
              )}>
                <div className="flex items-center gap-3">
                  <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0', {
                    'bg-green-100 text-green-700': isPaid,
                    'bg-red-100 text-red-700': isLate,
                    'bg-gray-100 text-gray-600': !isPaid && !isLate,
                  })}>
                    {isPaid ? <CheckCircle size={16} /> : inst.sequence_number || inst.sequence}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {parseFloat(inst.amount).toLocaleString()} {schedule.currency}
                      </p>
                      <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', {
                        'bg-green-100 text-green-700': isPaid,
                        'bg-red-100 text-red-600': isLate,
                        'bg-gray-100 text-gray-500': !isPaid && !isLate,
                      })}>
                        {isPaid ? (locale === 'ar' ? 'مدفوع' : isPaid && locale === 'fr' ? 'Payé' : 'Paid')
                          : isLate ? (locale === 'ar' ? 'متأخر' : locale === 'fr' ? 'En retard' : 'Late')
                          : (locale === 'ar' ? 'معلق' : locale === 'fr' ? 'En attente' : 'Pending')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400">
                        {inst.due_date ? format(new Date(inst.due_date), 'dd MMM yyyy') : '—'}
                      </p>
                      <span className="text-gray-300">·</span>
                      <p className="text-xs font-mono text-gray-400">{ref}</p>
                      <CopyButton text={ref} />
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Help */}
      <Card className="bg-navy-50 border-navy-100">
        <p className="text-xs font-semibold text-navy-700 mb-1">
          {locale === 'ar' ? 'هل تحتاج مساعدة في الدفع؟' : locale === 'fr' ? "Besoin d'aide pour payer ?" : 'Need help with payments?'}
        </p>
        <p className="text-xs text-navy-600">
          {locale === 'ar' ? 'تواصل مع فريق FORSA: payments@forsa.tn | +216 XX XXX XXX'
            : locale === 'fr' ? "Contactez l'équipe FORSA : payments@forsa.tn | +216 XX XXX XXX"
            : 'Contact FORSA team: payments@forsa.tn | +216 XX XXX XXX'}
        </p>
      </Card>
    </div>
  )
}

// ─── Receipt Upload Component ──────────────────────────────────────────────────
function ReceiptUpload({ installments, applicationId, currency, t, locale, onSuccess }: {
  installments: any[]; applicationId: string; currency: string
  t: (k: string) => string; locale: string; onSuccess: () => void
}) {
  const [selectedInstallment, setSelectedInstallment] = useState('')
  const [form, setForm] = useState({ paymentDate: format(new Date(), 'yyyy-MM-dd'), amount: '', bankName: '', reference: '' })
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const pendingInstallments = installments.filter(i => i.status !== 'paid')

  const handleSubmit = async () => {
    if (!selectedInstallment || !form.paymentDate || !form.amount) {
      setError(locale === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : locale === 'fr' ? 'Veuillez remplir tous les champs obligatoires' : 'Please fill all required fields')
      return
    }
    setSubmitting(true); setError('')
    try {
      // Upload receipt via documents API if file provided
      const payload: any = {
        installmentId: selectedInstallment,
        paymentDate: form.paymentDate,
        amount: parseFloat(form.amount),
        bankName: form.bankName,
        referenceNumber: form.reference,
        receiptFilename: file?.name || null,
        notes: form.bankName || form.reference
          ? `Bank: ${form.bankName || '—'} · Ref: ${form.reference || '—'}`
          : null,
      }
      // Submit payment record to backend
      await api.post('/payments/receipts', payload)
      setSuccess(true); onSuccess()
      setForm({ paymentDate: format(new Date(), 'yyyy-MM-dd'), amount: '', bankName: '', reference: '' })
      setFile(null); setSelectedInstallment('')
      setTimeout(() => setSuccess(false), 5000)
    } catch (err: any) {
      setError(err?.response?.data?.message || (locale === 'ar' ? 'فشل التقديم. حاول مرة أخرى.' : locale === 'fr' ? 'Échec. Réessayez.' : 'Submission failed. Please try again.'))
    } finally { setSubmitting(false) }
  }

  if (pendingInstallments.length === 0) return null

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Upload size={15} className="text-navy-700" />
        <p className="text-sm font-semibold text-gray-900">{t('uploadReceipt')}</p>
      </div>
      <p className="text-xs text-gray-400 mb-4">{t('uploadReceiptDesc')}</p>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-2">
          <CheckCircle size={15} className="text-green-500" />
          <p className="text-sm text-green-700">{t('receiptSubmitted')}</p>
        </div>
      )}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="space-y-3">
        {/* Installment picker */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1.5">
            {locale === 'ar' ? 'القسط المدفوع *' : locale === 'fr' ? 'Versement payé *' : 'Installment paid *'}
          </label>
          <select className="input text-sm" value={selectedInstallment} onChange={e => setSelectedInstallment(e.target.value)}>
            <option value="">{locale === 'ar' ? 'اختر القسط' : locale === 'fr' ? 'Sélectionner le versement' : 'Select installment'}</option>
            {pendingInstallments.map((inst: any) => (
              <option key={inst.id} value={inst.id}>
                #{inst.sequence_number || inst.sequence} — {parseFloat(inst.amount).toLocaleString()} {currency}
                {inst.due_date ? ` (${format(new Date(inst.due_date), 'dd MMM')})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">{t('paymentDate')} *</label>
            <input type="date" className="input text-sm" value={form.paymentDate}
              onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
              max={format(new Date(), 'yyyy-MM-dd')} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">{t('paidAmount')} *</label>
            <input type="number" className="input text-sm" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="350" min="0" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">{t('bankName')}</label>
            <input className="input text-sm" value={form.bankName}
              onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
              placeholder={locale === 'ar' ? 'بنك الزيتونة' : 'Zitouna Bank'} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">{t('referenceNumber')}</label>
            <input className="input text-sm" value={form.reference}
              onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
              placeholder="TRF-2026-..." />
          </div>
        </div>

        {/* File upload */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1.5">{t('receiptFile')}</label>
          <label className={clsx(
            'flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all',
            file ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
          )}>
            <Upload size={16} className={file ? 'text-teal-500' : 'text-gray-400'} />
            <span className="text-sm text-gray-600 truncate">
              {file ? file.name : (locale === 'ar' ? 'اختر الملف (صورة أو PDF)' : locale === 'fr' ? 'Choisir le fichier (image ou PDF)' : 'Choose file (image or PDF)')}
            </span>
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
        </div>

        <button onClick={handleSubmit} disabled={submitting || !selectedInstallment || !form.amount || !form.paymentDate}
          className="btn-primary w-full justify-center py-3">
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {submitting ? (locale === 'ar' ? 'جاري الإرسال...' : locale === 'fr' ? 'Envoi...' : 'Submitting...') : t('submitReceipt')}
        </button>

        <p className="text-xs text-gray-400 text-center">
          <Info size={11} className="inline me-1" />
          {locale === 'ar' ? 'يمكنك فقط رفع إيصالات الدفع. لا يُسمح بتحميل وثائق الهوية أو الوثائق الحساسة عبر الإنترنت.'
            : locale === 'fr' ? "Vous ne pouvez télécharger que des reçus de paiement. Les documents d'identité sensibles ne sont pas acceptés en ligne."
            : 'You can only upload payment receipts. Sensitive identity documents are not accepted online.'}
        </p>
      </div>
    </Card>
  )
}
