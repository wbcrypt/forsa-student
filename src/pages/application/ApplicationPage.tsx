import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { studentApi, applicationApi } from '../../lib/api'
import { StatusBadge, Card, Spinner, EmptyState } from '../../components/ui'
import { FileText, ChevronRight, Clock, CheckCircle, AlertCircle, Hourglass, ListChecks } from 'lucide-react'
import { format } from 'date-fns'


export default function ApplicationPage() {
  const { user } = useAuth()
  const { t, locale } = useLocale()

  const { data: applications, isLoading } = useQuery({
    queryKey: ['student-apps', user?.id],
    queryFn: () => studentApi.getApplications().then(r => r.data),
    enabled: !!user?.id,
  })

  if (isLoading) return <Spinner className="h-64" />

  const latestApp = applications?.[0]

  if (!latestApp) {
    return (
      <div className="space-y-5">
        <h1 className="section-title">{t('myApplication')}</h1>
        <EmptyState
          icon={FileText}
          title={locale === 'ar' ? 'لا يوجد طلب بعد' : locale === 'fr' ? 'Pas encore de dossier' : 'No application yet'}
          description="Apply for a FORSA tuition facilitation plan to fund your university studies."
          action={<Link to="/apply" className="btn-teal">Apply now</Link>}
        />
      </div>
    )
  }

  return <ApplicationDetail app={latestApp} />
}

function ApplicationDetail({ app }: { app: any }) {
  const { t } = useLocale()

  const { data: history } = useQuery({
    queryKey: ['app-history', app.id],
    queryFn: () => applicationApi.getStatusHistory(app.id).then(r => r.data),
  })

  const { data: timeline } = useQuery({
    queryKey: ['app-timeline', app.id],
    queryFn: () => applicationApi.getTimeline(app.id).then(r => r.data),
  })

  const isApproved = ['approved_level1', 'approved_level2', 'approved_level3'].includes(app.current_status)
  const isRejected = app.current_status === 'rejected'
  const isWaitingList = app.current_status === 'capital_queue'

  const { data: queuePosition } = useQuery({
    queryKey: ['queue-position', app.id],
    queryFn: () => applicationApi.getQueuePosition(app.id).then(r => r.data),
    enabled: isWaitingList,
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="section-title">{t('myApplication')}</h1>
        <StatusBadge status={app.current_status} />
      </div>

      {/* University card */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-navy-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-navy-700 font-bold text-lg">
              {(app.university_name || 'U')[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">{app.university_name || '—'}</p>
            <p className="text-sm text-gray-500 mt-0.5">{app.program_name || 'No program'}</p>
            <p className="text-xs text-gray-400 mt-1">{app.academic_year}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400">Tuition Amount</p>
            <p className="text-lg font-bold text-gray-900">
              {parseFloat(app.tuition_amount || '0').toLocaleString()}
              <span className="text-sm font-normal text-gray-400 ms-1">{app.currency || 'TND'}</span>
            </p>
          </div>
          {app.approved_amount && (
            <div>
              <p className="text-xs text-gray-400">Approved Amount</p>
              <p className="text-lg font-bold text-teal-600">
                {parseFloat(app.approved_amount).toLocaleString()}
                <span className="text-sm font-normal text-teal-400 ms-1">TND</span>
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400">Application Date</p>
            <p className="text-sm font-medium text-gray-700">
              {app.lead_date ? format(new Date(app.lead_date), 'dd MMM yyyy') : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">FORSA Score</p>
            <p className="text-sm font-medium text-gray-700">{app.aggregate_score || 500}</p>
          </div>
        </div>
      </Card>

      {/* Decision banner */}
      {isApproved && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">Congratulations! Your application is approved 🎉</p>
            <p className="text-sm text-green-700 mt-1">
              You've been approved for {parseFloat(app.approved_amount || app.tuition_amount || '0').toLocaleString()} TND.
              {app.current_status === 'approved_level2' && ' Level 2 tuition facilitation — concurrent payment model.'}
            </p>
            {app.decision_explanation && (
              <p className="text-xs text-green-600 mt-2 opacity-75">{app.decision_explanation}</p>
            )}
          </div>
        </div>
      )}

      {isRejected && (
        <div className="space-y-3">
          {/* Bronze Member banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🥉</span>
              <div>
                <p className="font-bold text-amber-800">{t('bronzeTitle')}</p>
                <p className="text-xs text-amber-600 mt-0.5">FORSA Ecosystem Member</p>
              </div>
            </div>
            <p className="text-sm text-amber-700 leading-relaxed">{t('bronzeDesc')}</p>
          </div>

          {/* What's included */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('bronzeWhat')}</p>
            <ul className="space-y-2">
              {(['bronzeItem1','bronzeItem2','bronzeItem3','bronzeItem4','bronzeItem5','bronzeItem6'] as const).map(key => (
                <li key={key} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <span className="text-teal-500 flex-shrink-0">✓</span>
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>

          {/* What happens next */}
          <div className="bg-navy-50 border border-navy-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-navy-700 mb-1">{t('bronzeNext')}</p>
            <p className="text-sm text-navy-600 leading-relaxed">{t('bronzeNextDesc')}</p>
            <p className="text-xs text-navy-500 mt-3">
              {t('bronzeContact')} <a href="mailto:members@forsa.tn" className="font-medium underline">members@forsa.tn</a>
            </p>
          </div>

          <Link to="/apply" className="btn-teal w-full py-3 flex items-center justify-center">{t('applyAgain')}</Link>
        </div>
      )}

      {/* Phase 10 — Waiting List Experience. capital_queue is explicitly
          not a rejection; a waitlisted student should never feel
          abandoned or left with just "you are on the waiting list." */}
      {isWaitingList && (
        <div className="space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Hourglass size={24} className="text-yellow-700 flex-shrink-0" />
              <p className="font-bold text-yellow-800">{t('waitingListTitle')}</p>
            </div>
            <p className="text-sm text-yellow-700 leading-relaxed">{t('waitingListDesc')}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm text-amber-700 leading-relaxed">🥉 {t('waitingListBronze')}</p>
          </div>

          {queuePosition?.inQueue && queuePosition.position && (
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <ListChecks size={16} className="text-navy-700" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('waitingListPosition')}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                #{queuePosition.position} <span className="text-sm font-normal text-gray-400">{t('waitingListOf')} {queuePosition.total}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">{t('waitingListPositionDesc')}</p>
            </Card>
          )}

          <div className="bg-navy-50 border border-navy-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-navy-700 mb-1">{t('waitingListNext')}</p>
            <p className="text-sm text-navy-600 leading-relaxed">{t('waitingListNextDesc')}</p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">{t('waitingListWhileYouWait')}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{t('waitingListWhileYouWaitDesc')}</p>
          </div>
        </div>
      )}

      {app.current_status === 'waiting_for_documents' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800">Documents required</p>
            <p className="text-sm text-amber-700 mt-1">Please upload the required documents to continue.</p>
            <Link to="/documents" className="btn-primary mt-3 text-sm inline-flex">
              Upload documents
            </Link>
          </div>
        </div>
      )}

      {/* Application Timeline — workflow architecture redesign: plain-
          language customer-journey milestones (Application Started,
          Application Submitted, Documents Verified, Guarantor Status,
          Under Review, Decision, University Confirmation, Active
          Student), computed server-side from the exact same data the
          admin's internal Pipeline view uses, so the two can never
          disagree about where the application actually stands — they
          just describe it in completely different vocabularies. */}
      <Card>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Application Timeline</p>
        <div className="space-y-4">
          {(timeline?.milestones || []).map((m: any, i: number) => {
            const isCompleted = m.status === 'done'
            const isCurrent = m.status === 'current'
            return (
              <div key={m.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center mt-0.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted ? 'bg-teal-500' : isCurrent ? 'bg-navy-800' : 'bg-gray-100'
                  }`}>
                    {isCompleted
                      ? <CheckCircle size={14} className="text-white" />
                      : isCurrent
                      ? <Clock size={14} className="text-white" />
                      : <span className="text-xs text-gray-400 font-medium">{i + 1}</span>
                    }
                  </div>
                  {i < (timeline?.milestones.length || 0) - 1 && (
                    <div className={`w-0.5 h-6 mt-1 ${isCompleted ? 'bg-teal-300' : 'bg-gray-100'}`} />
                  )}
                </div>
                <div className="pb-2">
                  <p className={`text-sm font-medium ${isCurrent ? 'text-navy-800' : isCompleted ? 'text-teal-700' : 'text-gray-400'}`}>
                    {m.label}
                  </p>
                  {m.detail && (isCurrent || isCompleted) && (
                    <p className="text-xs text-gray-500 mt-0.5">{m.detail}</p>
                  )}
                  {isCurrent && !m.detail && (
                    <p className="text-xs text-gray-500 mt-0.5">Currently here</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Status history */}
      {history && history.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Timeline</p>
          <div className="space-y-3">
            {history.map((h: any, i: number) => (
              <div key={h.id || i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-teal-400 mt-2 flex-shrink-0" />
                <div>
                  {h.to_status && <StatusBadge status={h.to_status} />}
                  {h.notes && <p className="text-xs text-gray-500 mt-1">{h.notes}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {h.changed_at ? format(new Date(h.changed_at), 'dd MMM yyyy · HH:mm') : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/documents" className="card p-4 flex items-center gap-3 hover:shadow-card-hover transition-all">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileText size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{t('documents')}</p>
            <p className="text-xs text-gray-400">Upload & track</p>
          </div>
          <ChevronRight size={14} className="text-gray-300 ms-auto" />
        </Link>
        <Link to="/payments" className="card p-4 flex items-center gap-3 hover:shadow-card-hover transition-all">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
            <FileText size={16} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{t('payments')}</p>
            <p className="text-xs text-gray-400">View schedule</p>
          </div>
          <ChevronRight size={14} className="text-gray-300 ms-auto" />
        </Link>
      </div>
    </div>
  )
}
