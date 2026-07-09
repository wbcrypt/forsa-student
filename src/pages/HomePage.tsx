import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../hooks/useLocale'
import { studentApi, paymentApi } from '../lib/api'
import { Card, SkeletonCard } from '../components/ui'
import {
  Award, CreditCard, ArrowRight, CheckCircle, Clock,
  AlertTriangle, Upload, FileText, Wallet, Circle
} from 'lucide-react'
import { format } from 'date-fns'

// T-220 (Phase 2 groundwork, "membership-first" dashboard reshape).
// New spec (forsa-os/implementation/IMPLEMENTATION_NOTES.md §"Student Dashboard")
// wants this page built around: Welcome, Membership Status, FORSA ID, Digital
// Student Pass, Profile Completion, Financing Status, Next Action, Payment
// Status — replacing the old "FORSA score + latest application status +
// quick-action tiles" layout. Explicit design goal: "every page must reduce
// anxiety" — one clear next action beats a dense status table.
//
// Membership Status / FORSA ID / Digital Student Pass have NO backend endpoint
// yet (they depend on forsa-os T-201-T-206, not built as of this session) — the
// three tiles below render clearly-labeled placeholder/preview data so the
// layout isn't wasted once the real endpoints land. Everything else (Profile
// Completion, Financing Status, Next Action, Payment Status) is wired to real,
// already-working endpoints.

export default function HomePage() {
  const { user } = useAuth()
  const { t, locale } = useLocale()

  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student-me', user?.id],
    queryFn: () => studentApi.getMe().then(r => r.data),
    enabled: !!user?.id,
  })

  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ['student-apps', user?.id],
    queryFn: () => studentApi.getApplications().then(r => r.data),
    enabled: !!user?.id,
  })

  const latestApp = applications?.[0]

  const { data: schedule } = useQuery({
    queryKey: ['schedule', latestApp?.id],
    queryFn: () => paymentApi.getSchedule(latestApp!.id).then(r => r.data),
    enabled: !!latestApp?.id,
  })

  const firstName = student?.first_name || user?.email?.split('@')[0] || 'Student'
  const status = latestApp?.current_status || ''

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div>
        <p className="text-gray-500 text-sm">{t('hello')},</p>
        <h1 className="text-2xl font-bold text-gray-900">{firstName} 👋</h1>
      </div>

      {/* Phase 10 — Bronze Dashboard Next Steps. Replaces the old ambiguous
          "Start your FORSA journey" single card with a real checklist so a
          first-time student always sees exactly which concrete action is
          next, never just "apply now" with no context for why. Only shown
          before an application exists — once one does, the richer
          FinancingStatusCard/NextActionCard below track the deeper
          post-submission states (payment due, rejected, waiting list...). */}
      {!appsLoading && !latestApp && (
        <OnboardingChecklist student={student} locale={locale} />
      )}

      {/* Next Action — the one thing to do, always first, once an
          application exists */}
      {!!latestApp && (
        <NextActionCard status={status} hasApplication={!!latestApp} schedule={schedule} locale={locale} />
      )}

      {/* Membership Status / FORSA ID / Digital Pass — all real now
          (T-203/T-204/T-205/T-206). */}
      <div className="grid grid-cols-3 gap-3">
        <MembershipStatusTile student={student} locale={locale} />
        <ForsaIdTile student={student} locale={locale} />
        <DigitalPassTile student={student} locale={locale} />
      </div>

      {/* Profile Completion — real, computed from the student record */}
      {!studentLoading && <ProfileCompletionCard student={student} locale={locale} />}

      {/* Financing Status — real */}
      {appsLoading ? <SkeletonCard /> : (
        <FinancingStatusCard latestApp={latestApp} locale={locale} t={t} />
      )}

      {/* Payment Status — real */}
      {latestApp && schedule && <PaymentStatusCard schedule={schedule} locale={locale} t={t} />}
    </div>
  )
}

// ─── Next Action ────────────────────────────────────────────────────────────
// Only ever rendered once an application exists (see the pre-application
// OnboardingChecklist below) — hasApplication is always true here.
function NextActionCard({ status, hasApplication, schedule, locale }: {
  status: string; hasApplication: boolean; schedule: any; locale: string
}) {
  const installments = schedule?.installments || []
  const nextDue = installments.find((i: any) => ['pending', 'due_soon', 'due_today', 'late'].includes(i.status))

  type Action = { icon: any; title: string; desc: string; cta: string; to: string }
  let action: Action

  if (['new_lead', 'contacted', 'under_review'].includes(status)) {
    action = {
      icon: Clock,
      title: locale === 'ar' ? 'طلبك قيد المراجعة' : locale === 'fr' ? 'Votre dossier est en cours de révision' : "We're reviewing your application",
      desc: locale === 'ar' ? 'سنعلمك فور توفر تحديث. لا حاجة لأي إجراء الآن.' : locale === 'fr' ? "Nous vous informerons dès qu'il y a du nouveau. Aucune action requise pour le moment." : "We'll let you know as soon as there's an update. No action needed right now.",
      cta: locale === 'ar' ? 'عرض التفاصيل' : locale === 'fr' ? 'Voir les détails' : 'View details',
      to: '/application',
    }
  } else if (['waiting_for_documents', 'documents_received'].includes(status)) {
    action = {
      icon: Upload,
      title: locale === 'ar' ? 'مطلوب وثائق' : locale === 'fr' ? 'Documents requis' : 'Documents needed',
      desc: locale === 'ar' ? 'راجع قائمة الوثائق المطلوبة لاجتماع التفعيل.' : locale === 'fr' ? "Consultez la liste des documents requis pour votre réunion d'activation." : 'Check the list of documents needed for your activation meeting.',
      cta: locale === 'ar' ? 'عرض القائمة' : locale === 'fr' ? 'Voir la liste' : 'View checklist',
      to: '/documents',
    }
  } else if (['approved_level1', 'approved_level2', 'approved_level3', 'pre_approved', 'contract_sent'].includes(status)) {
    action = {
      icon: CheckCircle,
      title: locale === 'ar' ? 'حان وقت اجتماع التفعيل' : locale === 'fr' ? "C'est l'heure de la réunion d'activation" : 'Time for your activation meeting',
      desc: locale === 'ar' ? 'طلبك موافق عليه مبدئياً. حدد موعد اجتماع التفعيل الخاص بك.' : locale === 'fr' ? "Votre demande est pré-approuvée. Planifiez votre réunion d'activation." : 'Your request is pre-approved. Schedule your activation meeting.',
      cta: locale === 'ar' ? 'عرض التفاصيل' : locale === 'fr' ? 'Voir les détails' : 'View details',
      to: '/documents',
    }
  } else if (nextDue) {
    action = {
      icon: CreditCard,
      title: locale === 'ar' ? 'لديك دفعة مستحقة' : locale === 'fr' ? 'Vous avez un paiement à effectuer' : 'You have a payment due',
      desc: locale === 'ar'
        ? `${parseFloat(nextDue.amount).toLocaleString()} ${schedule.currency} — ${nextDue.due_date ? format(new Date(nextDue.due_date), 'dd MMM yyyy') : ''}`
        : `${parseFloat(nextDue.amount).toLocaleString()} ${schedule.currency} · ${nextDue.due_date ? format(new Date(nextDue.due_date), 'dd MMM yyyy') : ''}`,
      cta: locale === 'ar' ? 'ادفع الآن' : locale === 'fr' ? 'Payer maintenant' : 'Pay now',
      to: '/payments',
    }
  } else if (['active_student', 'university_paid', 'contract_signed'].includes(status)) {
    action = {
      icon: CheckCircle,
      title: locale === 'ar' ? 'أنت طالب FORSA نشط' : locale === 'fr' ? 'Vous êtes un étudiant FORSA actif' : "You're an active FORSA student",
      desc: locale === 'ar' ? 'لا يوجد إجراء مطلوب حالياً. تابع جدول دفعاتك في أي وقت.' : locale === 'fr' ? "Aucune action requise pour le moment. Consultez votre échéancier à tout moment." : 'No action needed right now. Check your payment schedule anytime.',
      cta: locale === 'ar' ? 'عرض المدفوعات' : locale === 'fr' ? 'Voir les paiements' : 'View payments',
      to: '/payments',
    }
  } else if (status === 'capital_queue') {
    action = {
      icon: Clock,
      title: locale === 'ar' ? 'أنت على قائمة الانتظار' : locale === 'fr' ? "Vous êtes sur liste d'attente" : "You're on the waiting list",
      desc: locale === 'ar' ? 'لم يتم رفضك — طلبك في الانتظار حتى تتوفر الأموال اللازمة. عضويتك البرونزية نشطة بالكامل.' : locale === 'fr' ? "Vous n'avez pas été refusé — votre demande attend que des fonds soient disponibles. Votre adhésion Bronze reste pleinement active." : "You haven't been rejected — your request is waiting for funding to become available. Your Bronze membership stays fully active.",
      cta: locale === 'ar' ? 'عرض التفاصيل' : locale === 'fr' ? 'Voir les détails' : 'View details',
      to: '/application',
    }
  } else if (status === 'rejected') {
    action = {
      icon: AlertTriangle,
      title: locale === 'ar' ? 'لم تتم الموافقة هذه المرة' : locale === 'fr' ? "Pas d'approbation cette fois" : 'Not approved this time',
      desc: locale === 'ar' ? 'تواصل مع فريق FORSA لمعرفة الخطوات التالية الممكنة.' : locale === 'fr' ? "Contactez l'équipe FORSA pour connaître les prochaines étapes possibles." : 'Contact the FORSA team to learn about possible next steps.',
      cta: locale === 'ar' ? 'عرض التفاصيل' : locale === 'fr' ? 'Voir les détails' : 'View details',
      to: '/application',
    }
  } else {
    action = {
      icon: FileText,
      title: locale === 'ar' ? 'طلبك قيد المعالجة' : locale === 'fr' ? 'Votre dossier est en cours de traitement' : 'Your application is in progress',
      desc: locale === 'ar' ? 'تابع حالة طلبك في أي وقت.' : locale === 'fr' ? "Suivez l'état de votre dossier à tout moment." : 'Track your application status anytime.',
      cta: locale === 'ar' ? 'عرض التفاصيل' : locale === 'fr' ? 'Voir les détails' : 'View details',
      to: '/application',
    }
  }

  const Icon = action.icon
  return (
    <Link to={action.to}>
      <div className="bg-gradient-to-br from-navy-800 to-navy-950 rounded-2xl p-5 text-white shadow-lg active:scale-[0.99] transition-transform">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Icon size={20} className="text-teal-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-teal-300 uppercase tracking-wide mb-0.5">
              {locale === 'ar' ? 'الخطوة التالية' : locale === 'fr' ? 'Prochaine étape' : 'Next action'}
            </p>
            <p className="font-bold leading-snug">{action.title}</p>
            <p className="text-sm text-white/70 mt-1 leading-relaxed">{action.desc}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-1 mt-4 text-sm font-semibold text-teal-300">
          {action.cta} <ArrowRight size={14} />
        </div>
      </div>
    </Link>
  )
}

// ─── Onboarding Checklist (Phase 10) ────────────────────────────────────────
// Replaces the old single ambiguous "Start your FORSA journey" card. A
// first-time Bronze member should never have to wonder what to do next —
// every step is either done, the one current required action, or a locked
// preview of what comes after. Only the first incomplete step gets a CTA;
// everything after it is visibly "up next" but not yet actionable.
function OnboardingChecklist({ student, locale }: { student: any; locale: string }) {
  const guarantors: any[] = (student?.guarantors || []).filter((g: any) => g && g.id)
  const hasLiveGuarantor = guarantors.some(g => g.status === 'active' || g.status === 'pending_invitation')

  const profileFields = [
    student?.first_name, student?.last_name, student?.email, student?.phone_primary,
    student?.city, student?.nationality, student?.academic_level, student?.date_of_birth,
  ]
  const profileComplete = profileFields.every(Boolean)

  type Step = { key: string; label: Record<string, string>; done: boolean; to: string; cta: Record<string, string> }
  const steps: Step[] = [
    { key: 'membership', label: { en: 'Membership Approved', fr: 'Adhésion approuvée', ar: 'تمت الموافقة على العضوية' }, done: true, to: '', cta: { en: '', fr: '', ar: '' } },
    { key: 'forsaId', label: { en: 'FORSA ID Issued', fr: 'Identifiant FORSA émis', ar: 'تم إصدار رقم FORSA' }, done: true, to: '', cta: { en: '', fr: '', ar: '' } },
    { key: 'pass', label: { en: 'Digital Pass Issued', fr: 'Carte numérique émise', ar: 'تم إصدار البطاقة الرقمية' }, done: true, to: '', cta: { en: '', fr: '', ar: '' } },
    {
      key: 'profile', label: { en: 'Complete Profile', fr: 'Compléter le profil', ar: 'إكمال الملف الشخصي' },
      done: profileComplete, to: '/profile',
      cta: { en: 'Complete profile', fr: 'Compléter le profil', ar: 'إكمال الملف' },
    },
    {
      key: 'guarantor', label: { en: 'Invite Guarantor', fr: 'Inviter un garant', ar: 'دعوة ضامن' },
      done: hasLiveGuarantor, to: '/guarantor',
      cta: { en: 'Invite a guarantor', fr: 'Inviter un garant', ar: 'دعوة ضامن' },
    },
    {
      key: 'apply', label: { en: 'Submit Tuition Facilitation Request', fr: 'Soumettre une demande de facilitation', ar: 'تقديم طلب تيسير المعاليم' },
      done: false, to: '/apply',
      cta: { en: 'Apply now', fr: 'Postuler maintenant', ar: 'تقدم الآن' },
    },
  ]

  const nextStep = steps.find(s => !s.done)

  return (
    <Card>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {locale === 'ar' ? 'رحلتك مع FORSA' : locale === 'fr' ? 'Votre parcours FORSA' : 'Your FORSA Journey'}
      </p>
      <div className="space-y-2.5">
        {steps.map(step => (
          <div key={step.key} className="flex items-center gap-2.5">
            {step.done
              ? <CheckCircle size={17} className="text-teal-500 flex-shrink-0" />
              : <Circle size={17} className={step.key === nextStep?.key ? 'text-navy-700 flex-shrink-0' : 'text-gray-300 flex-shrink-0'} />}
            <span className={`text-sm ${step.done ? 'text-gray-400 line-through' : step.key === nextStep?.key ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
              {step.label[locale] || step.label.en}
            </span>
          </div>
        ))}
      </div>
      {nextStep && (
        <Link to={nextStep.to}
          className="btn-teal w-full mt-4 flex items-center justify-center gap-1.5">
          {nextStep.cta[locale] || nextStep.cta.en} <ArrowRight size={14} />
        </Link>
      )}
    </Card>
  )
}

// ─── Preview tile shell (shared look; `live` suppresses the "Preview" badge
// once a tile is backed by a real endpoint — Digital Pass is still the only
// one that isn't, pending T-205/T-206) ──────────────────────────────────────
function PreviewTile({ icon: Icon, label, value, sub, live = false }: {
  icon: any; label: string; value: string; sub: string; live?: boolean
}) {
  return (
    <div className="card p-3 relative overflow-hidden">
      {!live && (
        <span className="absolute top-2 end-2 text-[9px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
          Preview
        </span>
      )}
      <div className="w-8 h-8 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center mb-2">
        <Icon size={15} />
      </div>
      <p className="text-[11px] text-gray-400 leading-tight">{label}</p>
      <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
      <p className="text-[10px] text-gray-400 truncate">{sub}</p>
    </div>
  )
}

// T-203/T-204 — real, from students.membership_status (set on Membership
// Request approval, per D-004 a pure ratchet: bronze -> silver -> gold,
// never automatically back down). Accounts created before this migration
// (the old T-101 direct-register flow) have no membership_status at all —
// shown honestly as "Not a member yet" rather than defaulting to Bronze.
const MEMBERSHIP_LABEL: Record<string, Record<string, string>> = {
  bronze: { en: 'Bronze', fr: 'Bronze', ar: 'برونزي' },
  silver: { en: 'Silver', fr: 'Argent', ar: 'فضي' },
  gold: { en: 'Gold', fr: 'Or', ar: 'ذهبي' },
  blacklisted: { en: 'Suspended', fr: 'Suspendu', ar: 'موقوف' },
}
function MembershipStatusTile({ student, locale }: { student: any; locale: string }) {
  const status = student?.membership_status as string | undefined
  const value = status ? (MEMBERSHIP_LABEL[status]?.[locale] || MEMBERSHIP_LABEL[status]?.en || status)
    : (locale === 'ar' ? 'ليس عضواً بعد' : locale === 'fr' ? 'Pas encore membre' : 'Not a member yet')
  const sub = student?.member_since
    ? `${locale === 'ar' ? 'منذ' : locale === 'fr' ? 'Depuis' : 'Since'} ${format(new Date(student.member_since), 'MMM yyyy')}`
    : (locale === 'ar' ? 'قدّم طلب عضوية' : locale === 'fr' ? "Soumettez une demande d'adhésion" : 'Submit a Membership Request')
  return (
    <PreviewTile icon={Award}
      label={locale === 'ar' ? 'العضوية' : locale === 'fr' ? 'Adhésion' : 'Membership'}
      value={value} sub={sub} live={!!status} />
  )
}

// T-204 — real, assigned once on Bronze issuance (MembershipService.approve,
// FORSA-<year>-<6 hex chars>), never regenerated.
function ForsaIdTile({ student, locale }: { student: any; locale: string }) {
  const forsaId = student?.forsa_id as string | undefined
  return (
    <PreviewTile icon={FileText}
      label={locale === 'ar' ? 'رقم FORSA' : 'FORSA ID'}
      value={forsaId || '—'}
      sub={forsaId ? '' : (locale === 'ar' ? 'غير معيّن بعد' : locale === 'fr' ? 'Pas encore assigné' : 'Not assigned yet')}
      live={!!forsaId} />
  )
}

// T-205/T-206 — a pass is issued atomically alongside membership_status in
// MembershipService.approve(), so student.membership_status being set is a
// reliable signal the pass also exists, without an extra fetch just for
// this tile — the /pass page itself fetches the real pass + QR code.
function DigitalPassTile({ student, locale }: { student: any; locale: string }) {
  const issued = !!student?.membership_status
  return (
    <Link to="/pass">
      <PreviewTile icon={Wallet}
        label={locale === 'ar' ? 'البطاقة الرقمية' : locale === 'fr' ? 'Carte numérique' : 'Digital Pass'}
        value={issued ? (locale === 'ar' ? 'صادرة' : locale === 'fr' ? 'Émise' : 'Issued') : (locale === 'ar' ? 'غير متاح' : locale === 'fr' ? 'Indisponible' : 'Not issued')}
        sub={issued ? (locale === 'ar' ? 'عرض البطاقة' : locale === 'fr' ? 'Voir la carte' : 'View pass') : (locale === 'ar' ? 'انضم أولاً' : locale === 'fr' ? "Rejoignez d'abord" : 'Join first')}
        live={issued} />
    </Link>
  )
}

// ─── Profile Completion (real) ──────────────────────────────────────────────
function ProfileCompletionCard({ student, locale }: { student: any; locale: string }) {
  const fields = [
    student?.first_name, student?.last_name, student?.email, student?.phone_primary,
    student?.city, student?.nationality, student?.academic_level, student?.date_of_birth,
  ]
  const filled = fields.filter(Boolean).length
  const pct = Math.round((filled / fields.length) * 100)

  return (
    <Link to="/profile">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-900">
            {locale === 'ar' ? 'اكتمال الملف الشخصي' : locale === 'fr' ? 'Profil complété' : 'Profile Completion'}
          </p>
          <span className="text-sm font-bold text-navy-800">{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-navy-700 to-navy-500 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }} />
        </div>
        {pct < 100 && (
          <p className="text-xs text-gray-400 mt-2">
            {locale === 'ar' ? 'أكمل ملفك الشخصي لتسريع طلبك.' : locale === 'fr' ? 'Complétez votre profil pour accélérer votre dossier.' : 'Complete your profile to speed up your request.'}
          </p>
        )}
      </Card>
    </Link>
  )
}

// ─── Financing Status (real) ────────────────────────────────────────────────
function FinancingStatusCard({ latestApp, locale, t }: { latestApp: any; locale: string; t: (k: string) => string }) {
  if (!latestApp) {
    return (
      <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-navy-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FileText size={22} className="text-navy-600" />
          </div>
          <p className="font-semibold text-gray-900">{t('noApplicationYet')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('applyToGetStarted')}</p>
          <Link to="/apply" className="btn-teal mt-4 text-sm">{t('applyNow')}</Link>
        </div>
      </Card>
    )
  }

  const statuses = ['new_lead', 'contacted', 'waiting_for_documents', 'documents_received', 'under_review', 'approved_level1', 'approved_level2', 'approved_level3', 'contract_sent', 'contract_signed', 'active_student', 'completed']
  const currentIdx = statuses.indexOf(latestApp.current_status)

  return (
    <Link to={`/application/${latestApp.id}`}>
      <Card className="border-2 border-navy-100 hover:border-navy-300 transition-all">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              {locale === 'ar' ? 'حالة خطة تيسير المعاليم' : locale === 'fr' ? 'Statut du plan de facilitation' : 'Tuition Facilitation Status'}
            </p>
            <p className="text-base font-semibold text-gray-900 mt-0.5">
              {latestApp.university_name || 'University'}
            </p>
            <p className="text-sm text-gray-500">{latestApp.program_name || 'Program'} · {latestApp.academic_year}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-4">
          {[
            { s: 'new_lead', label: 'Received' },
            { s: 'under_review', label: 'Review' },
            { s: 'approved_level2', label: 'Decision' },
            { s: 'active_student', label: 'Active' },
          ].map((stage, i) => {
            const stageIdx = statuses.indexOf(stage.s)
            const done = currentIdx >= stageIdx
            return (
              <div key={stage.s} className="flex items-center flex-1">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-teal-500' : 'bg-gray-200'}`} />
                {i < 3 && <div className={`flex-1 h-0.5 ${done ? 'bg-teal-500' : 'bg-gray-200'}`} />}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {parseFloat(latestApp.tuition_amount || '0').toLocaleString()} {latestApp.currency || 'TND'}
          </p>
          <span className="text-xs text-navy-700 font-medium flex items-center gap-1">
            {t('checkStatus')} <ArrowRight size={14} />
          </span>
        </div>
      </Card>
    </Link>
  )
}

// ─── Payment Status (real) ──────────────────────────────────────────────────
function PaymentStatusCard({ schedule, locale, t }: { schedule: any; locale: string; t: (k: string) => string }) {
  const installments = schedule?.installments || []
  const paidCount = installments.filter((i: any) => i.status === 'paid').length
  const total = schedule?.installment_count || installments.length
  const nextDue = installments.find((i: any) => ['pending', 'due_soon', 'due_today', 'late'].includes(i.status))
  const lateCount = installments.filter((i: any) => i.status === 'late' || i.status === 'default_risk').length

  return (
    <Link to="/payments">
      <Card>
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900">
            {locale === 'ar' ? 'حالة الدفع' : locale === 'fr' ? 'Statut du paiement' : 'Payment Status'}
          </p>
          <span className="text-xs text-navy-700 font-medium flex items-center gap-1">
            {t('viewAll')} <ArrowRight size={12} />
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="text-xl font-bold text-gray-900">{paidCount}<span className="text-sm text-gray-400 font-normal">/{total}</span></p>
            <p className="text-xs text-gray-400">
              {locale === 'ar' ? 'أقساط مدفوعة' : locale === 'fr' ? 'versements payés' : 'installments paid'}
            </p>
          </div>
          {lateCount > 0 ? (
            <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1.5 rounded-xl text-xs font-medium">
              <AlertTriangle size={13} /> {lateCount} {locale === 'ar' ? 'متأخر' : locale === 'fr' ? 'en retard' : 'late'}
            </div>
          ) : nextDue ? (
            <div className="text-right">
              <p className="text-xs text-gray-400">{locale === 'ar' ? 'القادم' : locale === 'fr' ? 'Prochain' : 'Next due'}</p>
              <p className="text-sm font-semibold text-gray-900">
                {nextDue.due_date ? format(new Date(nextDue.due_date), 'dd MMM') : '—'}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl text-xs font-medium">
              <CheckCircle size={13} /> {locale === 'ar' ? 'كل شيء على ما يرام' : locale === 'fr' ? 'À jour' : 'All caught up'}
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}
