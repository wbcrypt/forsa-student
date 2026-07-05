// Phase 2 T-205/T-206 — Digital Student Pass display. The QR code is
// generated server-side (same pattern as MFA setup) and embedded as a data
// URL — no frontend QR library needed. Scanning it hits the public
// GET /pass/verify/:token, a live status check, not a static payload.
import { useQuery } from '@tanstack/react-query'
import { useLocale } from '../../hooks/useLocale'
import { digitalPassApi } from '../../lib/api'
import { Card, Spinner, EmptyState } from '../../components/ui'
import { Wallet, Ban } from 'lucide-react'
import { format } from 'date-fns'

const MEMBERSHIP_LABEL: Record<string, Record<string, string>> = {
  bronze: { en: 'Bronze', fr: 'Bronze', ar: 'برونزي' },
  silver: { en: 'Silver', fr: 'Argent', ar: 'فضي' },
  gold: { en: 'Gold', fr: 'Or', ar: 'ذهبي' },
}

export default function PassPage() {
  const { locale } = useLocale()

  const { data: pass, isLoading, isError } = useQuery({
    queryKey: ['my-digital-pass'],
    queryFn: () => digitalPassApi.getMine().then(r => r.data),
    retry: false,
  })

  if (isLoading) return <Spinner className="h-64" />

  if (isError || !pass) return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">
        {locale === 'ar' ? 'البطاقة الرقمية' : locale === 'fr' ? 'Carte numérique' : 'Digital Student Pass'}
      </h1>
      <EmptyState icon={Wallet}
        title={locale === 'ar' ? 'لم تُصدر بطاقة بعد' : locale === 'fr' ? "Aucune carte émise pour l'instant" : 'No pass issued yet'}
        description={locale === 'ar' ? 'تُصدر البطاقة الرقمية تلقائياً عند الموافقة على طلب العضوية.'
          : locale === 'fr' ? 'La carte numérique est émise automatiquement dès l\'approbation de votre demande d\'adhésion.'
          : 'Your Digital Student Pass is issued automatically once your Membership Request is approved.'} />
    </div>
  )

  const isRevoked = pass.status === 'revoked'
  const level = MEMBERSHIP_LABEL[pass.membership_status]?.[locale] || MEMBERSHIP_LABEL[pass.membership_status]?.en || pass.membership_status

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">
        {locale === 'ar' ? 'البطاقة الرقمية' : locale === 'fr' ? 'Carte numérique' : 'Digital Student Pass'}
      </h1>

      <div className={`rounded-3xl p-6 text-white shadow-xl relative overflow-hidden ${
        isRevoked ? 'bg-gray-400' : 'bg-gradient-to-br from-navy-900 via-navy-800 to-teal-700'
      }`}>
        {isRevoked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <div className="flex items-center gap-2 bg-white/90 text-red-600 font-bold px-4 py-2 rounded-xl">
              <Ban size={18} /> {locale === 'ar' ? 'ملغاة' : locale === 'fr' ? 'Révoquée' : 'Revoked'}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 mb-6">
          <img src="/logo.png" alt="FORSA" className="w-8 h-8 object-contain" />
          <span className="font-bold text-lg">FORSA</span>
        </div>
        <p className="text-xs text-white/60 uppercase tracking-wide">
          {locale === 'ar' ? 'رقم FORSA' : 'FORSA ID'}
        </p>
        <p className="text-lg font-mono font-bold mb-4">{pass.forsa_id}</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wide">
              {locale === 'ar' ? 'مستوى العضوية' : locale === 'fr' ? "Niveau d'adhésion" : 'Membership Level'}
            </p>
            <p className="text-2xl font-bold">{level}</p>
            {pass.member_since && (
              <p className="text-xs text-white/60 mt-1">
                {locale === 'ar' ? 'عضو منذ' : locale === 'fr' ? 'Membre depuis' : 'Member since'} {format(new Date(pass.member_since), 'MMM yyyy')}
              </p>
            )}
          </div>
          <img src={pass.qrCode} alt="QR verification code" className="w-24 h-24 bg-white rounded-xl p-1.5" />
        </div>
      </div>

      <Card>
        <p className="text-xs text-gray-500 leading-relaxed">
          {locale === 'ar'
            ? 'يمكن لأي شخص مسح رمز QR للتحقق الفوري من صلاحية عضويتك — لا تتم مشاركة بيانات شخصية حساسة.'
            : locale === 'fr'
            ? "Ce QR code peut être scanné pour une vérification en direct de la validité de votre adhésion — aucune donnée personnelle sensible n'est partagée."
            : 'This QR code can be scanned for a live verification of your membership validity — no sensitive personal data is shared.'}
        </p>
      </Card>
    </div>
  )
}
