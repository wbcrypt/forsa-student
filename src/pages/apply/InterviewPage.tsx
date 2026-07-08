// src/pages/apply/InterviewPage.tsx
// Phase 3: AI Interview — calls backend proxy (never exposes API key)

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '../../hooks/useLocale'
import type { Locale } from '../../lib/i18n'
import { applicationApi, studentApi } from '../../lib/api'
import api from '../../lib/api'
import { Alert } from '../../components/ui'
import { Send, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ApplyData {
  firstName: string; lastName: string; dateOfBirth: string
  phone: string; email: string; city: string; nationality: string
  universityId: string; universityName: string
  programId: string; program: string; yearOfStudy: string; programTuition: number | null
  isCurrentStudent: string; preferredLanguage: Locale
  // Phase 14 — student-requested plan and the required fee acknowledgment.
  requestedTier: string; platformFeeAcknowledged: boolean; forsaChoiceReason: string
  paymentResponsible: string; householdIncome: string
  hasGuarantor: string; employmentStatus: string
  consentsAt: string
  guarantorFirstName: string; guarantorLastName: string; guarantorEmail: string; guarantorRelationship: string
}

// ─── System prompt ───────────────────────────────────────────────────────────
function buildSystemPrompt(data: ApplyData, lang: Locale): string {
  const langName = lang === 'ar' ? 'Arabic' : lang === 'fr' ? 'French' : 'English'
  return `You are FORSA's AI readiness interviewer. Warm, professional, genuinely curious.
Conduct the ENTIRE interview in ${langName}. Ask ONE question at a time. Be conversational.
Student: ${data.firstName} ${data.lastName} | University: ${data.universityName} | Program: ${data.program}
Tuition: ${data.programTuition} TND | Requested plan: ${data.requestedTier} | Payment by: ${data.paymentResponsible} | Guarantor: ${data.hasGuarantor}
Income: ${data.householdIncome} | Employment: ${data.employmentStatus}
Cover 4 pillars naturally: Educational Readiness, Financial Readiness, Planning Readiness, Commitment Readiness.
After 8 exchanges, wrap up warmly. NEVER say approved/rejected/bronze. You do NOT make decisions. You evaluate readiness only.`
}

// ─── Scoring prompt ───────────────────────────────────────────────────────────
// T-211/D-003 — the 5 dimensions here must match
// forsa-os/src/ai/household-stability.util.ts's HOUSEHOLD_STABILITY_WEIGHTS
// keys exactly (householdStability/financialCapacity/academicCommitment/
// documentationQuality/aiInterviewAssessment) — the backend recomputes the
// actual weighted overall score from these raw per-dimension numbers
// itself (D-003: 35/25/20/10/10) and ignores whatever "overall" figure the
// LLM might also produce, since models are unreliable at precise weighted
// arithmetic and a client-supplied combined score can't be trusted
// directly either way.
function buildScoringPrompt(data: ApplyData, messages: Message[], lang: Locale): string {
  const transcript = messages.map(m => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`).join('\n\n')
  return `You are a FORSA analyst. Review this ${lang} interview and return ONLY valid JSON:
Student: ${data.firstName} ${data.lastName} | ${data.universityName} | ${data.program} | ${data.programTuition} TND
TRANSCRIPT:\n${transcript}
Score each dimension 0-100 based on the interview and the student's stated situation:
- householdStability: family/guarantor situation stability, housing, dependents
- financialCapacity: ability to sustain the payment plan given income/guarantor support
- academicCommitment: seriousness about the programme, attendance/continuation likelihood
- documentationQuality: clarity/completeness/consistency of what the student shared
- aiInterviewAssessment: overall impression from the conversation itself (communication, realism)
Return exactly:
{"scores":{"householdStability":<0-100>,"financialCapacity":<0-100>,"academicCommitment":<0-100>,"documentationQuality":<0-100>,"aiInterviewAssessment":<0-100>},"executive_summary":"<2-3 sentences EN>","executive_summary_fr":"<2-3 sentences FR>","strengths":["<s1>","<s2>","<s3>"],"concerns":["<c1>"],"risk_flags":[],"missing_information":[],"recommended_next_steps":["<step1>","<step2>"],"interview_language":"${lang}","interview_conducted_at":"${new Date().toISOString()}"}`
}

// ─── API calls through backend ────────────────────────────────────────────────
async function callAI(
  messages: Array<{ role: string; content: string }>,
  system: string,
  studentData: ApplyData,
  isDemo: boolean,
): Promise<string> {
  if (isDemo) {
    const res = await api.post('/ai/demo-interview', {
      messages,
      system,
      studentData,
    })
    return res.data.content
  } else {
    const res = await api.post('/ai/interview', {
      messages,
      system,
      max_tokens: 800,
    })
    return res.data.content
  }
}

async function callAIScore(prompt: string, isDemo: boolean): Promise<string> {
  if (isDemo) {
    // T-109/K-18 — this used to fabricate a Math.random()-generated
    // "AI score" (scores.overall_forsa_score etc.) and that fake number
    // flowed straight into the real application's aiScoreOverall field —
    // indistinguishable from a genuine AI assessment to anyone reviewing
    // it later, with only a small "🎭 Demo mode" chat-UI badge (never
    // persisted) as disclosure. Demo mode now honestly reports that no
    // real AI assessment happened — see completeInterview, which uses
    // `demo_mode` below to null out aiScoreOverall/aiRecommendation
    // entirely rather than submitting fabricated numbers as real ones.
    return JSON.stringify({
      demo_mode: true,
      scores: null,
      executive_summary: 'AI assessment unavailable for this interview (demo mode) — no automated score was generated. This application requires manual interview review by FORSA staff.',
      executive_summary_fr: "Évaluation IA indisponible pour cet entretien (mode démo) — aucun score automatique n'a été généré. Ce dossier nécessite une révision manuelle par l'équipe FORSA.",
      strengths: [],
      concerns: [],
      risk_flags: [],
      missing_information: ['Real AI assessment was unavailable — full manual review required'],
      recommended_next_steps: ['Conduct manual readiness review'],
      recommendation: null,
      interview_language: 'fr',
      interview_conducted_at: new Date().toISOString(),
    })
  } else {
    const res = await api.post('/ai/score', { prompt })
    return res.data.content
  }
}

export default function InterviewPage() {
  const navigate = useNavigate()
  const { locale } = useLocale()
  const [data, setData] = useState<ApplyData | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [phase, setPhase] = useState<'interview' | 'completing' | 'done' | 'error'>('interview')
  const [error, setError] = useState('')
  const [submissionError, setSubmissionError] = useState('')
  const [guarantorWarning, setGuarantorWarning] = useState('')
  const [isDemo, setIsDemo] = useState(false)
  const [turnCount, setTurnCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const completionTriggered = useRef(false)

  const lang: Locale = (data?.preferredLanguage || locale) as Locale

  useEffect(() => {
    const stored = sessionStorage.getItem('forsa_apply_data')
    if (!stored) { navigate('/apply'); return }
    const parsed = JSON.parse(stored) as ApplyData
    setData(parsed)
  }, [navigate])

  useEffect(() => {
    if (!data || messages.length > 0) return
    startInterview(data)
  }, [data])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startInterview = async (studentData: ApplyData) => {
    setInitializing(true)
    try {
      // Check if demo mode via backend
      const systemPrompt = buildSystemPrompt(studentData, studentData.preferredLanguage)
      const reply = await callAI([], systemPrompt, studentData, false)
      setIsDemo(false)
      setMessages([{ role: 'assistant', content: reply, timestamp: new Date() }])
    } catch (err: any) {
      // Fall back to demo mode
      setIsDemo(true)
      try {
        const demoReply = await callAI([], '', studentData, true)
        setMessages([{ role: 'assistant', content: demoReply, timestamp: new Date() }])
      } catch {
        setError(lang === 'ar' ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : lang === 'fr' ? 'Erreur de connexion. Veuillez réessayer.' : 'Connection error. Please try again.')
      }
    } finally {
      setInitializing(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading || !data) return
    const userMsg: Message = { role: 'user', content: input.trim(), timestamp: new Date() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    const newTurn = turnCount + 1
    setTurnCount(newTurn)

    try {
      const systemPrompt = buildSystemPrompt(data, lang)
      const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }))

      const wrapUp = newTurn >= 8
      if (wrapUp && !isDemo) {
        apiMessages.push({
          role: 'user' as const,
          content: '[SYSTEM: Wrap up warmly. Thank the student. This is your final message.]'
        })
      }

      const reply = await callAI(apiMessages, systemPrompt, data, isDemo)
      const assistantMsg: Message = { role: 'assistant', content: reply, timestamp: new Date() }
      const finalMessages = [...updatedMessages, assistantMsg]
      setMessages(finalMessages)

      if (wrapUp && !completionTriggered.current) {
        completionTriggered.current = true
        setTimeout(() => completeInterview(data, finalMessages), 2500)
      }
    } catch {
      setError(lang === 'ar' ? 'فشل الإرسال. يرجى المحاولة مرة أخرى.' : lang === 'fr' ? "Échec de l'envoi. Réessayez." : 'Send failed. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  const completeInterview = async (studentData: ApplyData, finalMessages: Message[]) => {
    setPhase('completing')
    try {
      const scoringPrompt = buildScoringPrompt(studentData, finalMessages, lang)
      const scoringText = await callAIScore(scoringPrompt, isDemo)

      let aiReport: any = {}
      try {
        const match = scoringText.match(/\{[\s\S]*\}/)
        if (match) aiReport = JSON.parse(match[0])
      } catch {}

      const transcript = finalMessages
        .map(m => `[${m.role === 'user' ? studentData.firstName : 'FORSA AI'}] ${m.content}`)
        .join('\n\n---\n\n')

      // T-109/K-18/T-211 — never submit a demo-mode fabricated score as if
      // it were a real AI assessment. aiReport.demo_mode is set by
      // callAIScore() above whenever the real /ai/score endpoint wasn't
      // used. The backend (applications.service.ts#create) is the one
      // that actually computes ai_score_overall/ai_recommendation now —
      // deterministically, from aiReport.scores, using the approved D-003
      // weights — and ignores demo-mode reports (scores: null) entirely.
      // This client no longer sends aiScoreOverall/aiRecommendation at
      // all; there's nothing meaningful for it to compute itself, and
      // sending them would just be dead fields the backend already ignores.
      const wasDemo = isDemo || aiReport.demo_mode === true

      try {
        await applicationApi.create({
          universityId: studentData.universityId || undefined,
          programId: studentData.programId || undefined,
          // Phase 14 — tuitionAmount is deliberately not sent: the server
          // derives it itself from programs.tuition_amount and never
          // trusts a client-supplied figure for it.
          currency: 'TND',
          academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
          requestedTier: studentData.requestedTier || undefined,
          platformFeeAcknowledged: studentData.platformFeeAcknowledged,
          forsaChoiceReason: studentData.forsaChoiceReason || undefined,
          // Was studentData.isCurrentStudent === 'yes' — isRenewal means
          // "renewing a previous Tuition Facilitation Plan," a completely
          // different question from "are you currently enrolled." Every
          // current-student applicant was being mislabeled as a renewal.
          // No renewal-tracking UI exists yet (the applicant doesn't pick
          // a previous application to renew), so this is always false for
          // now rather than guessing from an unrelated field.
          isRenewal: false,
          interviewLanguage: lang,
          interviewTranscript: transcript,
          aiReport: JSON.stringify({ ...aiReport, demo_mode: wasDemo }),
        })
      } catch (err: any) {
        // T-207 — was a bare `catch { /* still show done */ }`: any
        // submission failure was silently swallowed and the user still
        // saw "Interview Complete!" even though no application was ever
        // created. The new membership gate (POST /applications/me, 403
        // for a non-Bronze account) makes this a real, common failure
        // mode rather than a rare edge case — surface it honestly instead
        // of faking success.
        if (err?.response?.status === 403) {
          setSubmissionError(err.response?.data?.message ||
            'You need an active FORSA membership before submitting a tuition facilitation plan request.')
          setPhase('error')
          return
        }
        if (err?.response?.status === 400 && err.response?.data?.message) {
          // Duplicate-request block, validation errors, etc. — the backend
          // message is already specific; the generic fallback below wrongly
          // implies something broke and support needs contacting.
          setSubmissionError(err.response.data.message)
          setPhase('error')
          return
        }
        setSubmissionError('Your interview was recorded, but submitting your tuition facilitation plan request failed. Please contact FORSA support.')
        setPhase('error')
        return
      }

      // Workflow alignment fix — requirement 3: "Guarantor invitation
      // should be triggered only after the Tuition Facilitation
      // application is created/submitted." The application above is now
      // real, so it's safe to send the invite. If this specific call
      // fails, the application itself is NOT rolled back (it already
      // exists and is valid) — surfaced as a warning on the done screen
      // instead, with a pointer to /guarantor where the invite can be
      // sent again.
      try {
        await studentApi.addGuarantor({
          firstName: studentData.guarantorFirstName,
          lastName: studentData.guarantorLastName,
          email: studentData.guarantorEmail,
          relationship: studentData.guarantorRelationship || undefined,
        })
      } catch (err: any) {
        setGuarantorWarning(err?.response?.data?.message ||
          'Your application was submitted, but the guarantor invitation could not be sent. You can send it from the Guarantor page.')
      }

      sessionStorage.removeItem('forsa_apply_data')
      setPhase('done')
    } catch {
      setPhase('done')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const L = {
    preparing: { en: 'Preparing your interview…', fr: 'Préparation de votre entretien…', ar: 'جاري تحضير مقابلتك…' },
    thinking: { en: 'FORSA is thinking…', fr: 'FORSA réfléchit…', ar: 'FORSA يفكر…' },
    placeholder: { en: 'Type your answer…', fr: 'Écrivez votre réponse…', ar: 'اكتب إجابتك…' },
    hint: { en: 'Enter to send · Shift+Enter for new line', fr: 'Entrée pour envoyer · Maj+Entrée pour nouvelle ligne', ar: 'Enter للإرسال · Shift+Enter لسطر جديد' },
    endBtn: { en: 'End interview', fr: "Terminer l'entretien", ar: 'إنهاء المقابلة' },
    completing: { en: 'Submitting your application…', fr: 'Envoi de votre dossier…', ar: 'جاري إرسال طلبك…' },
    doneTitle: { en: 'Interview Complete!', fr: 'Entretien terminé !', ar: 'اكتملت المقابلة!' },
    doneDesc: { en: 'Our team will review your application and determine your FORSA pathway. Every applicant becomes part of the FORSA community.', fr: 'Notre équipe examinera votre dossier et déterminera votre voie FORSA. Chaque candidat fait partie de la communauté FORSA.', ar: 'سيراجع فريقنا طلبك ويحدد مسارك في FORSA. كل متقدم يصبح جزءاً من مجتمع FORSA.' },
    doneNotice: { en: 'Every FORSA applicant is placed in the most suitable pathway: Gold, Silver, or Bronze. Bronze members receive full ecosystem access and are prioritised when new capacity opens.', fr: "Chaque candidat FORSA est placé dans la voie la plus adaptée : Gold, Silver ou Bronze. Les membres Bronze bénéficient d'accès complet à l'écosystème et sont prioritaires à l'ouverture de nouvelles capacités.", ar: 'يُوضع كل متقدم في FORSA في المسار الأنسب له: ذهبي أو فضي أو برونزي. يحصل الأعضاء البرونزيون على وصول كامل للمنظومة وأولوية عند فتح طاقة استيعاب جديدة.' },
    goHome: { en: 'Return to my account', fr: 'Retourner à mon compte', ar: 'العودة إلى حسابي' },
    title: { en: 'FORSA Interview', fr: 'Entretien FORSA', ar: 'مقابلة FORSA' },
    subtitle: { en: 'AI Assistant · Does not make decisions', fr: 'Assistant IA · Ne prend pas de décisions', ar: 'مساعد ذكاء اصطناعي · لا يتخذ قرارات' },
    turn: { en: 'Turn', fr: 'Tour', ar: 'استدارة' },
    demoLabel: { en: '🎭 Demo mode', fr: '🎭 Mode démo', ar: '🎭 وضع العرض' },
  }
  const l = (key: keyof typeof L): string => L[key][lang] || L[key].en

  if (initializing) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 bg-teal-500/10 rounded-2xl flex items-center justify-center">
        <Loader2 size={28} className="text-teal-500 animate-spin" />
      </div>
      <p className="text-gray-500 text-sm">{l('preparing')}</p>
    </div>
  )

  if (phase === 'completing') return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 bg-navy-800/10 rounded-2xl flex items-center justify-center">
        <Loader2 size={28} className="text-navy-800 animate-spin" />
      </div>
      <p className="text-gray-700 font-medium">{l('completing')}</p>
    </div>
  )

  if (phase === 'error') return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
      <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center">
        <AlertTriangle size={40} className="text-amber-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {locale === 'ar' ? 'تعذر إرسال طلبك' : locale === 'fr' ? "Impossible d'envoyer votre demande" : "Couldn't submit your request"}
        </h2>
        <p className="text-gray-500 text-sm mt-2 max-w-sm leading-relaxed">{submissionError}</p>
      </div>
      <button onClick={() => navigate('/join')} className="btn-teal py-3 px-8">
        {locale === 'ar' ? 'تقديم طلب عضوية' : locale === 'fr' ? "Soumettre une demande d'adhésion" : 'Submit a Membership Request'}
      </button>
      <button onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-gray-600">
        {locale === 'ar' ? 'العودة إلى الرئيسية' : locale === 'fr' ? "Retour à l'accueil" : 'Back to home'}
      </button>
    </div>
  )

  if (phase === 'done') return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
      <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center">
        <CheckCircle size={40} className="text-green-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{l('doneTitle')}</h2>
        <p className="text-gray-500 text-sm mt-2 max-w-sm leading-relaxed">{l('doneDesc')}</p>
      </div>
      <div className="bg-navy-50 border border-navy-100 rounded-2xl p-4 text-sm text-navy-700 max-w-sm leading-relaxed">
        {l('doneNotice')}
      </div>
      {guarantorWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700 max-w-sm leading-relaxed">
          {guarantorWarning}
        </div>
      )}
      <button onClick={() => navigate('/')} className="btn-teal py-3 px-8">{l('goHome')}</button>
    </div>
  )

  return (
    <div className="flex flex-col max-w-lg mx-auto" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100 flex-shrink-0">
        <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold">F</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{l('title')}</p>
          <p className="text-xs text-gray-400">{l('subtitle')}</p>
        </div>
        <div className="ms-auto flex items-center gap-2">
          {isDemo && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{l('demoLabel')}</span>}
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{l('turn')} {turnCount}/8</span>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={clsx('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-navy-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">F</span>
              </div>
            )}
            <div className={clsx(
              'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'assistant' ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'bg-navy-800 text-white rounded-tr-sm'
            )}>
              <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
              <p className={clsx('text-xs mt-1.5', msg.role === 'assistant' ? 'text-gray-400' : 'text-white/40')}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">{data?.firstName?.[0] || 'S'}</span>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-navy-800 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 size={12} className="animate-spin" /> {l('thinking')}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {phase === 'interview' && turnCount < 9 && (
        <div className="flex-shrink-0 pt-3 border-t border-gray-100">
          <div className="flex gap-3 items-end">
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={l('placeholder')} rows={2} disabled={loading}
              className="flex-1 input resize-none text-sm py-2.5 leading-relaxed"
              style={{ minHeight: '44px', maxHeight: '120px' }} />
            <button onClick={sendMessage} disabled={loading || !input.trim()} className="btn-primary p-3 rounded-xl flex-shrink-0 disabled:opacity-50">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">{l('hint')}</p>
          {turnCount >= 5 && (
            <div className="flex justify-center mt-2">
              <button onClick={() => {
                if (!completionTriggered.current && data) {
                  completionTriggered.current = true
                  completeInterview(data, messages)
                }
              }} className="text-xs text-gray-400 hover:text-gray-600 underline">{l('endBtn')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
