// src/pages/apply/ApplyPage.tsx
// Entry point — routes between Phase 1 (info), Phase 2 (consent), Phase 3 (AI interview)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { LOCALES, Locale } from '../../lib/i18n'
import { universityApi } from '../../lib/api'
import { useQuery } from '@tanstack/react-query'
import { Alert, Card, FormField, Spinner, StepProgress } from '../../components/ui'
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import clsx from 'clsx'

const STEPS_LABELS: Record<Locale, string[]> = {
  en: ['Your Profile', 'Legal Consent', 'AI Interview'],
  fr: ['Votre profil', 'Consentement', 'Entretien IA'],
  ar: ['ملفك', 'الموافقة', 'المقابلة'],
}

interface Phase1Data {
  // Personal
  firstName: string; lastName: string; dateOfBirth: string
  phone: string; email: string; city: string; nationality: string
  // Academic
  universityId: string; universityName: string
  program: string; yearOfStudy: string; tuitionAmount: string
  isCurrentStudent: 'yes' | 'no' | ''
  preferredLanguage: Locale
  // Financial
  paymentResponsible: string; householdIncome: string
  hasGuarantor: 'yes' | 'no' | ''
  employmentStatus: string
}

const EMPTY: Phase1Data = {
  firstName: '', lastName: '', dateOfBirth: '', phone: '', email: '', city: '', nationality: 'TN',
  universityId: '', universityName: '', program: '', yearOfStudy: '', tuitionAmount: '', isCurrentStudent: '',
  preferredLanguage: 'fr',
  paymentResponsible: '', householdIncome: '', hasGuarantor: '', employmentStatus: '',
}

export default function ApplyPage() {
  const { user } = useAuth()
  const { t, locale, changeLocale } = useLocale()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<1 | 2 | 3>(1)
  const [data, setData] = useState<Phase1Data>({ ...EMPTY, preferredLanguage: locale })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')

  const { data: unisData } = useQuery({
    queryKey: ['unis-for-apply'],
    queryFn: () => universityApi.list().then(r => r.data.data || []),
  })

  const { data: programs } = useQuery({
    queryKey: ['programs-apply', data.universityId],
    queryFn: () => universityApi.getPrograms(data.universityId).then(r => r.data),
    enabled: !!data.universityId,
  })

  const set = (field: keyof Phase1Data) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.value
    setData(d => ({ ...d, [field]: val }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const validate1 = (): boolean => {
    const e: Record<string, string> = {}
    if (!data.firstName.trim()) e.firstName = 'Required'
    if (!data.lastName.trim()) e.lastName = 'Required'
    if (!data.phone.trim()) e.phone = 'Required'
    if (!data.city.trim()) e.city = 'Required'
    if (!data.universityId) e.universityId = 'Please select a university'
    if (!data.program.trim()) e.program = 'Required'
    if (!data.tuitionAmount || parseFloat(data.tuitionAmount) <= 0) e.tuitionAmount = 'Enter a valid amount'
    if (!data.isCurrentStudent) e.isCurrentStudent = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validate2 = (): boolean => {
    const e: Record<string, string> = {}
    if (!data.paymentResponsible) e.paymentResponsible = 'Required'
    if (!data.householdIncome) e.householdIncome = 'Required'
    if (!data.hasGuarantor) e.hasGuarantor = 'Required'
    if (!data.employmentStatus) e.employmentStatus = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    setServerError('')
    if (phase === 1 && validate1()) {
      // Sync language choice
      changeLocale(data.preferredLanguage)
      setPhase(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (phase === 2 && validate2()) {
      setPhase(3)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (phase === 3) {
    return <ConsentGate data={data} onBack={() => setPhase(2)} />
  }

  const steps = STEPS_LABELS[locale] || STEPS_LABELS.en

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {locale === 'ar' ? 'التقدم للتمويل' : locale === 'fr' ? 'Demander un financement' : 'Apply for Financing'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {locale === 'ar' ? 'أكمل هذه المعلومات للبدء في مقابلتك مع FORSA'
            : locale === 'fr' ? 'Complétez ces informations pour commencer votre entretien FORSA'
            : 'Complete this information to begin your FORSA interview'}
        </p>
      </div>

      <StepProgress steps={steps} current={phase - 1} />

      {serverError && <Alert type="error" message={serverError} onClose={() => setServerError('')} />}

      {/* ── Phase 1: Personal + Academic ── */}
      {phase === 1 && (
        <div className="space-y-5">
          {/* Language first */}
          <Card>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {locale === 'ar' ? 'لغة المقابلة' : locale === 'fr' ? "Langue de l'entretien" : 'Interview Language'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {LOCALES.map(l => (
                <button key={l.code} type="button"
                  onClick={() => { setData(d => ({ ...d, preferredLanguage: l.code })); changeLocale(l.code) }}
                  className={clsx(
                    'py-3 rounded-xl border-2 text-sm font-medium transition-all',
                    data.preferredLanguage === l.code
                      ? 'border-navy-800 bg-navy-800 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  )}>
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Personal info */}
          <Card>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              {locale === 'ar' ? 'المعلومات الشخصية' : locale === 'fr' ? 'Informations personnelles' : 'Personal Information'}
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label={t('firstName')} required error={errors.firstName}>
                  <input className="input" value={data.firstName} onChange={set('firstName')} />
                </FormField>
                <FormField label={t('lastName')} required error={errors.lastName}>
                  <input className="input" value={data.lastName} onChange={set('lastName')} />
                </FormField>
              </div>
              <FormField label={locale === 'ar' ? 'تاريخ الميلاد' : locale === 'fr' ? 'Date de naissance' : 'Date of Birth'}>
                <input type="date" className="input" value={data.dateOfBirth} onChange={set('dateOfBirth')}
                  max={new Date().toISOString().split('T')[0]} />
              </FormField>
              <FormField label={t('phone')} required error={errors.phone}>
                <input className="input" value={data.phone} onChange={set('phone')} placeholder="+216 20 000 000" />
              </FormField>
              <FormField label={locale === 'ar' ? 'المدينة' : locale === 'fr' ? 'Ville' : 'City'} required error={errors.city}>
                <input className="input" value={data.city} onChange={set('city')} placeholder="Tunis" />
              </FormField>
              <FormField label={locale === 'ar' ? 'الجنسية' : locale === 'fr' ? 'Nationalité' : 'Nationality'}>
                <input className="input uppercase" value={data.nationality} onChange={set('nationality')} maxLength={2} placeholder="TN" />
              </FormField>
            </div>
          </Card>

          {/* Academic info */}
          <Card>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              {locale === 'ar' ? 'المعلومات الأكاديمية' : locale === 'fr' ? 'Informations académiques' : 'Academic Information'}
            </p>
            <div className="space-y-4">
              <FormField label={locale === 'ar' ? 'الجامعة' : locale === 'fr' ? 'Université' : 'University'} required error={errors.universityId}>
                <select className="input" value={data.universityId}
                  onChange={e => {
                    const sel = (unisData || []).find((u: any) => u.id === e.target.value)
                    setData(d => ({ ...d, universityId: e.target.value, universityName: sel?.name || '', program: '' }))
                    if (errors.universityId) setErrors(prev => { const n = { ...prev }; delete n.universityId; return n })
                  }}>
                  <option value="">Select university</option>
                  {(unisData || []).map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </FormField>

              <FormField label={locale === 'ar' ? 'البرنامج / التخصص' : locale === 'fr' ? 'Programme / Spécialité' : 'Program / Major'} required error={errors.program}>
                {programs && programs.length > 0 ? (
                  <select className="input" value={data.program}
                    onChange={e => setData(d => ({ ...d, program: e.target.value }))}>
                    <option value="">Select program</option>
                    {programs.map((p: any) => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                ) : (
                  <input className="input" value={data.program} onChange={set('program')} placeholder="e.g. Licence en Informatique" />
                )}
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label={locale === 'ar' ? 'سنة الدراسة' : locale === 'fr' ? "Année d'étude" : 'Year of Study'}>
                  <select className="input" value={data.yearOfStudy} onChange={set('yearOfStudy')}>
                    <option value="">Select</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                    <option value="5">Year 5+</option>
                  </select>
                </FormField>
                <FormField label={locale === 'ar' ? 'طالب حالي؟' : locale === 'fr' ? 'Étudiant actuel ?' : 'Current student?'} required error={errors.isCurrentStudent}>
                  <select className="input" value={data.isCurrentStudent} onChange={set('isCurrentStudent')}>
                    <option value="">Select</option>
                    <option value="yes">{locale === 'ar' ? 'نعم' : 'Yes'}</option>
                    <option value="no">{locale === 'ar' ? 'لا، طالب جديد' : locale === 'fr' ? 'Non, nouveau' : 'No, new student'}</option>
                  </select>
                </FormField>
              </div>

              <FormField label={locale === 'ar' ? 'مبلغ الرسوم الدراسية (TND)' : locale === 'fr' ? 'Frais de scolarité (TND)' : 'Tuition Amount (TND)'} required error={errors.tuitionAmount}>
                <div className="relative">
                  <input type="number" className="input pe-16" value={data.tuitionAmount} onChange={set('tuitionAmount')} placeholder="3500" min="0" />
                  <span className="absolute end-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">TND</span>
                </div>
              </FormField>
            </div>
          </Card>

          <button onClick={handleNext} className="btn-primary w-full py-3">
            {locale === 'ar' ? 'التالي' : locale === 'fr' ? 'Suivant' : 'Next'} <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Phase 2: Financial questions ── */}
      {phase === 2 && (
        <div className="space-y-5">
          <Card>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              {locale === 'ar' ? 'الوضع المالي' : locale === 'fr' ? 'Situation financière' : 'Financial Situation'}
            </p>
            <div className="space-y-4">
              <FormField
                label={locale === 'ar' ? 'من المتوقع أن يسدد الأقساط الشهرية؟' : locale === 'fr' ? 'Qui devrait payer les mensualités ?' : 'Who is expected to pay the monthly installments?'}
                required error={errors.paymentResponsible}>
                <select className="input" value={data.paymentResponsible} onChange={set('paymentResponsible')}>
                  <option value="">Select</option>
                  <option value="parent">{locale === 'ar' ? 'أحد الوالدين' : locale === 'fr' ? 'Un parent' : 'Parent'}</option>
                  <option value="self_student">{locale === 'ar' ? 'أنا (دخل الطالب)' : locale === 'fr' ? 'Moi-même (étudiant)' : 'Myself (student income)'}</option>
                  <option value="scholarship">{locale === 'ar' ? 'منحة دراسية' : locale === 'fr' ? "Bourse d'études" : 'Scholarship'}</option>
                  <option value="family">{locale === 'ar' ? 'أفراد الأسرة' : locale === 'fr' ? 'Famille' : 'Family members'}</option>
                  <option value="savings">{locale === 'ar' ? 'المدخرات' : locale === 'fr' ? 'Épargne' : 'Savings'}</option>
                  <option value="other">{locale === 'ar' ? 'أخرى' : locale === 'fr' ? 'Autre' : 'Other'}</option>
                </select>
              </FormField>

              <FormField
                label={locale === 'ar' ? 'نطاق الدخل الأسري الشهري' : locale === 'fr' ? 'Tranche de revenu familial mensuel' : 'Household monthly income range'}
                required error={errors.householdIncome}>
                <select className="input" value={data.householdIncome} onChange={set('householdIncome')}>
                  <option value="">Select</option>
                  <option value="under_500">{'< 500 TND'}</option>
                  <option value="500_1000">500 – 1,000 TND</option>
                  <option value="1000_2000">1,000 – 2,000 TND</option>
                  <option value="2000_3500">2,000 – 3,500 TND</option>
                  <option value="3500_plus">{'> 3,500 TND'}</option>
                </select>
              </FormField>

              <FormField
                label={locale === 'ar' ? 'هل لديك ضامن؟' : locale === 'fr' ? 'Avez-vous un garant ?' : 'Do you have a guarantor?'}
                required error={errors.hasGuarantor}>
                <div className="flex gap-3">
                  {['yes', 'no'].map(v => (
                    <button key={v} type="button"
                      onClick={() => { setData(d => ({ ...d, hasGuarantor: v as 'yes' | 'no' })); if (errors.hasGuarantor) setErrors(p => { const n = { ...p }; delete n.hasGuarantor; return n }) }}
                      className={clsx('flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                        data.hasGuarantor === v ? 'border-navy-800 bg-navy-800 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                      {v === 'yes' ? (locale === 'ar' ? 'نعم' : 'Yes') : (locale === 'ar' ? 'لا' : 'No')}
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField
                label={locale === 'ar' ? 'الوضع المهني' : locale === 'fr' ? 'Situation professionnelle' : 'Employment status'}
                required error={errors.employmentStatus}>
                <select className="input" value={data.employmentStatus} onChange={set('employmentStatus')}>
                  <option value="">Select</option>
                  <option value="student_only">{locale === 'ar' ? 'طالب فقط' : locale === 'fr' ? 'Étudiant uniquement' : 'Student only'}</option>
                  <option value="student_part_time">{locale === 'ar' ? 'طالب + عمل بدوام جزئي' : locale === 'fr' ? 'Étudiant + temps partiel' : 'Student + part-time work'}</option>
                  <option value="employed">{locale === 'ar' ? 'موظف' : locale === 'fr' ? 'Employé' : 'Employed'}</option>
                  <option value="self_employed">{locale === 'ar' ? 'عمل حر' : locale === 'fr' ? 'Indépendant' : 'Self-employed'}</option>
                  <option value="unemployed">{locale === 'ar' ? 'غير موظف' : locale === 'fr' ? 'Sans emploi' : 'Unemployed'}</option>
                </select>
              </FormField>
            </div>
          </Card>

          <div className="flex gap-3">
            <button onClick={() => setPhase(1)} className="btn-secondary flex-1 py-3">
              <ChevronLeft size={16} /> {locale === 'ar' ? 'رجوع' : locale === 'fr' ? 'Retour' : 'Back'}
            </button>
            <button onClick={handleNext} className="btn-primary flex-1 py-3">
              {locale === 'ar' ? 'التالي' : locale === 'fr' ? 'Suivant' : 'Next'} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Consent Gate (Phase 2 → 3 bridge) ──────────────────────────────────────
function ConsentGate({ data, onBack }: { data: Phase1Data; onBack: () => void }) {
  const { locale } = useLocale()
  const navigate = useNavigate()
  const [consents, setConsents] = useState({
    privacy: false, terms: false, dataProcessing: false, aiNotice: false, truthful: false
  })
  const [error, setError] = useState('')
  const allConsented = Object.values(consents).every(Boolean)

  const handleProceed = () => {
    if (!allConsented) { setError(locale === 'ar' ? 'يرجى قبول جميع الشروط' : locale === 'fr' ? 'Veuillez accepter toutes les conditions' : 'Please accept all conditions'); return }
    // Store data for interview page
    sessionStorage.setItem('forsa_apply_data', JSON.stringify({ ...data, consentsAt: new Date().toISOString() }))
    navigate('/apply/interview')
  }

  const CONSENT_ITEMS: Array<{ key: keyof typeof consents; label: Record<Locale, string>; desc?: Record<Locale, string> }> = [
    {
      key: 'privacy',
      label: { en: 'Privacy Policy', fr: 'Politique de confidentialité', ar: 'سياسة الخصوصية' },
      desc: { en: 'I have read and agree to the FORSA Privacy Policy regarding how my personal data is collected and used.', fr: "J"ai lu et accepte la Politique de confidentialité de FORSA concernant la collecte et l'utilisation de mes données personnelles.", ar: 'لقد قرأت ووافقت على سياسة خصوصية FORSA المتعلقة بكيفية جمع بياناتي الشخصية واستخدامها.' }
    },
    {
      key: 'terms',
      label: { en: 'Terms of Service', fr: "Conditions d'utilisation", ar: 'شروط الخدمة' },
      desc: { en: 'I accept the FORSA Terms of Service and understand the financing conditions.', fr: "J"accepte les Conditions d'utilisation de FORSA et comprends les conditions de financement.", ar: 'أقبل شروط خدمة FORSA وأفهم شروط التمويل.' }
    },
    {
      key: 'dataProcessing',
      label: { en: 'Personal Data Processing Consent', fr: 'Consentement au traitement des données', ar: 'موافقة على معالجة البيانات الشخصية' },
      desc: { en: 'I consent to FORSA processing my personal and financial data to evaluate my financing application.', fr: 'Je consens au traitement par FORSA de mes données personnelles et financières pour évaluer ma demande de financement.', ar: 'أوافق على قيام FORSA بمعالجة بياناتي الشخصية والمالية لتقييم طلب التمويل الخاص بي.' }
    },
    {
      key: 'aiNotice',
      label: { en: 'AI Interview Notice', fr: "Notice sur l'entretien IA", ar: 'إشعار المقابلة بالذكاء الاصطناعي' },
      desc: { en: 'I understand that the following interview is conducted by an AI assistant. The AI does NOT approve or reject applications. FORSA places every applicant in the most suitable pathway (Gold, Silver, or Bronze). All pathway decisions are made exclusively by the FORSA team.', fr: "Je comprends que l"entretien suivant est conduit par un assistant IA. L'IA n'approuve NI ne rejette les demandes. Toutes les décisions finales sont prises exclusivement par l'équipe FORSA. Une pré-approbation n'est pas une approbation finale.", ar: 'أفهم أن المقابلة التالية يُجريها مساعد ذكاء اصطناعي. لا يوافق الذكاء الاصطناعي على الطلبات ولا يرفضها. تضع FORSA كل متقدم في المسار الأنسب له (ذهبي أو فضي أو برونزي). جميع قرارات المسار يتخذها فريق FORSA حصراً.' }
    },
    {
      key: 'truthful',
      label: { en: 'Declaration of Truthfulness', fr: 'Déclaration de véracité', ar: 'إقرار بصحة المعلومات' },
      desc: { en: 'I declare that all information I have provided and will provide during this application is truthful, accurate, and complete to the best of my knowledge.', fr: "Je déclare que toutes les informations que j'ai fournies et fournirai lors de cette demande sont véridiques, exactes et complètes au meilleur de ma connaissance.', ar: 'أُقر بأن جميع المعلومات التي قدمتها وسأقدمها خلال هذا الطلب صحيحة ودقيقة وكاملة في حدود علمي.' }
    },
  ]

  const AI_NOTICE: Record<Locale, string> = {
    en: '⚡ Important: The AI interview helps us understand your readiness. Every applicant joins the FORSA ecosystem — Gold, Silver, or Bronze. The AI does not decide your pathway. Our team does.',
    fr: "⚡ Important : L"entretien IA nous aide à comprendre votre préparation. Chaque candidat rejoint l'écosystème FORSA — Gold, Silver ou Bronze. L'IA ne décide pas de votre voie. Notre équipe le fait.",
    ar: '⚡ هام: تساعدنا مقابلة الذكاء الاصطناعي على فهم مدى استعدادك. كل متقدم ينضم إلى منظومة FORSA — ذهبي أو فضي أو برونزي. الذكاء الاصطناعي لا يقرر مسارك. فريقنا يفعل ذلك.',
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {locale === 'ar' ? 'الموافقة القانونية' : locale === 'fr' ? 'Consentement légal' : 'Legal Consent'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {locale === 'ar' ? 'يرجى قراءة كل بند والموافقة عليه قبل المتابعة'
            : locale === 'fr' ? 'Veuillez lire et accepter chaque point avant de continuer'
            : 'Please read and accept each item before continuing'}
        </p>
      </div>

      {/* AI notice banner */}
      <div className="bg-navy-50 border border-navy-200 rounded-2xl p-4">
        <p className="text-sm text-navy-700 leading-relaxed">{AI_NOTICE[locale]}</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="space-y-3">
        {CONSENT_ITEMS.map(item => (
          <button key={item.key} type="button"
            onClick={() => setConsents(c => ({ ...c, [item.key]: !c[item.key] }))}
            className={clsx('w-full text-start p-4 rounded-2xl border-2 transition-all',
              consents[item.key] ? 'border-teal-500 bg-teal-50/50' : 'border-gray-200 bg-white hover:border-gray-300')}>
            <div className="flex items-start gap-3">
              <div className={clsx('w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all',
                consents[item.key] ? 'bg-teal-500 border-teal-500' : 'border-gray-300')}>
                {consents[item.key] && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.label[locale]}</p>
                {item.desc && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc[locale]}</p>}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1 py-3">
          <ChevronLeft size={16} /> {locale === 'ar' ? 'رجوع' : locale === 'fr' ? 'Retour' : 'Back'}
        </button>
        <button onClick={handleProceed}
          disabled={!allConsented}
          className={clsx('flex-1 py-3 rounded-xl font-semibold text-sm transition-all',
            allConsented ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
          {locale === 'ar' ? 'ابدأ المقابلة' : locale === 'fr' ? "Commencer l'entretien" : 'Start Interview'} →
        </button>
      </div>
    </div>
  )
}
