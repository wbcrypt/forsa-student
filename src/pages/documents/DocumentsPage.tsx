// Activation Meeting page — replaces document upload for sensitive documents
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { studentApi } from '../../lib/api'
import { Card, Alert } from '../../components/ui'
import {
  CheckCircle, Clock, MapPin, Phone, Mail, Users,
  FileText, AlertTriangle, ChevronRight, Calendar
} from 'lucide-react'
import clsx from 'clsx'

const DOCS_TO_BRING = [
  { key: 'docStudentId', icon: '🪪', required: true, sensitive: true },
  { key: 'docGuarantorId', icon: '🪪', required: true, sensitive: true },
  { key: 'docEnrollment', icon: '🎓', required: true, sensitive: false },
  { key: 'docTuitionInvoice', icon: '💳', required: true, sensitive: false },
  { key: 'docBankDetails', icon: '🏦', required: true, sensitive: true },
  { key: 'docIncomeProof', icon: '💼', required: true, sensitive: true },
]

const MEETING_STEPS = {
  en: [
    'Student and guarantor identity verification (original IDs)',
    'Enrollment and tuition invoice verification',
    'Financing contract review and signature',
    'Lettres de change (payment commitment forms) signature',
    'Copies of all documents provided to both parties',
    'Student account activated — payment schedule confirmed',
  ],
  fr: [
    'Vérification d'identité de l'étudiant et du garant (CIN originaux)',
    'Vérification de l'inscription et de la facture de scolarité',
    'Révision et signature du contrat de financement',
    'Signature des lettres de change (formulaires d'engagement de paiement)',
    'Remise des copies de tous les documents aux deux parties',
    'Compte étudiant activé — échéancier de paiement confirmé',
  ],
  ar: [
    'التحقق من هوية الطالب والضامن (بطاقات الهوية الأصلية)',
    'التحقق من التسجيل وفاتورة الرسوم الدراسية',
    'مراجعة عقد التمويل والتوقيع عليه',
    'توقيع الكمبيالات (نماذج الالتزام بالدفع)',
    'تسليم نسخ من جميع الوثائق للطرفين',
    'تفعيل حساب الطالب — تأكيد جدول الدفع',
  ],
}

function StatusGate({ status }: { status: string }) {
  const { t, locale } = useLocale()

  const isPreApproved = [
    'pre_approved', 'document_verification', 'contracts_signed', 'contract_signed',
    'contract_sent', 'approved_level1', 'approved_level2', 'approved_level3',
    'university_paid', 'university_payment', 'active_student', 'completed'
  ].includes(status)

  const isActive = status === 'active_student' || status === 'completed'

  if (isActive) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <CheckCircle size={24} className="text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-green-800">
            {locale === 'ar' ? 'تم التفعيل ✓' : locale === 'fr' ? 'Activé ✓' : 'Activated ✓'}
          </p>
          <p className="text-sm text-green-700 mt-1">
            {locale === 'ar' ? 'اكتمل اجتماع التفعيل الخاص بك. أنت طالب FORSA نشط الآن.'
              : locale === 'fr' ? "Votre réunion d'activation est terminée. Vous êtes maintenant un étudiant FORSA actif.'
              : 'Your activation meeting is complete. You are now an active FORSA student.'}
          </p>
        </div>
      </div>
    )
  }

  if (!isPreApproved) {
    return (
      <div className="card p-6 text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Clock size={24} className="text-gray-400" />
        </div>
        <p className="font-semibold text-gray-700">{t('notYetPreApproved')}</p>
        <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-sm mx-auto">
          {t('notYetPreApprovedDesc')}
        </p>
        <div className="mt-4 p-3 bg-navy-50 border border-navy-100 rounded-xl">
          <p className="text-xs text-navy-700">
            {locale === 'ar'
              ? 'مراحل الموافقة: مقدّم → مقابلة الذكاء الاصطناعي → مراجعة داخلية → موافقة مبدئية → اجتماع التفعيل'
              : locale === 'fr'
              ? "Étapes : Soumis → Entretien IA → Revue interne → Pré-approuvé → Réunion d'activation"
              : 'Steps: Submitted → AI Interview → Internal Review → Pre-Approved → Activation Meeting'}
          </p>
        </div>
      </div>
    )
  }

  return null
}

export default function DocumentsPage() {
  const { user } = useAuth()
  const { t, locale } = useLocale()

  const { data: applications } = useQuery({
    queryKey: ['student-apps', user?.id],
    queryFn: () => studentApi.getApplications(user!.id).then(r => r.data),
    enabled: !!user?.id,
  })

  const latestApp = applications?.[0]
  const status = latestApp?.current_status || ''

  const isPreApproved = [
    'pre_approved', 'document_verification', 'contracts_signed', 'contract_signed',
    'contract_sent', 'approved_level1', 'approved_level2', 'approved_level3',
    'university_paid', 'university_payment', 'active_student', 'completed'
  ].includes(status)

  const steps = MEETING_STEPS[locale] || MEETING_STEPS.en

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('activationMeeting')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {locale === 'ar' ? 'التحقق من الوثائق والتفعيل يتم حضورياً فقط'
            : locale === 'fr' ? "La vérification des documents et l'activation se font en personne uniquement"
            : 'Document verification and activation is in-person only'}
        </p>
      </div>

      {/* Security notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">
            {locale === 'ar' ? 'لا ترفع وثائق الهوية عبر الإنترنت'
              : locale === 'fr' ? "Ne téléchargez pas vos documents d'identité en ligne"
              : 'Do not upload identity documents online'}
          </p>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            {locale === 'ar'
              ? 'لأسباب أمنية، جميع الوثائق الحساسة (الهوية، الضامن، الدخل) تُقدَّم فقط في اجتماع التفعيل الحضوري مع فريق FORSA.'
              : locale === 'fr'
              ? "Pour des raisons de sécurité, tous les documents sensibles (identité, garant, revenus) sont présentés uniquement lors de la réunion d'activation en personne avec l'équipe FORSA.'
              : 'For security reasons, all sensitive documents (identity, guarantor, income) are presented only at the in-person activation meeting with the FORSA team.'}
          </p>
        </div>
      </div>

      {/* Status gate for non-pre-approved */}
      {!isPreApproved && <StatusGate status={status} />}

      {/* Pre-approved content */}
      {isPreApproved && (
        <>
          {/* Banner */}
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-teal-800">{t('activationMeetingDesc')}</p>
                <p className="text-sm text-teal-700 mt-1 font-medium">{t('guarantorMustAttend')}</p>
              </div>
            </div>
          </div>

          {/* Documents checklist */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-navy-700" />
              <p className="text-sm font-semibold text-gray-900">{t('bringDocuments')}</p>
            </div>
            <div className="space-y-3">
              {DOCS_TO_BRING.map((doc, i) => (
                <div key={doc.key} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 text-base">
                    {doc.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{t(doc.key)}</p>
                    {doc.sensitive && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        🔒 {locale === 'ar' ? 'وثيقة حساسة — حضوري فقط'
                          : locale === 'fr' ? 'Document sensible — présentiel uniquement'
                          : 'Sensitive — in-person only'}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-xs text-red-500 font-medium">
                    {locale === 'ar' ? 'مطلوب' : locale === 'fr' ? 'Requis' : 'Required'}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs text-blue-700 flex items-center gap-1">
                <Users size={12} />
                <strong>{t('guarantorMustAttend')}</strong>
              </p>
            </div>
          </Card>

          {/* What happens */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-navy-700" />
              <p className="text-sm font-semibold text-gray-900">{t('activationSteps')}</p>
            </div>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-navy-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Contact to schedule */}
          <Card className="bg-navy-50 border-navy-100">
            <div className="flex items-center gap-2 mb-3">
              <Phone size={15} className="text-navy-700" />
              <p className="text-sm font-semibold text-navy-800">{t('meetingContact')}</p>
            </div>
            <div className="space-y-2">
              {[
                { icon: Phone, value: '+216 XX XXX XXX', label: locale === 'ar' ? 'هاتف' : locale === 'fr' ? 'Téléphone' : 'Phone' },
                { icon: Mail, value: 'activation@forsa.tn', label: 'Email' },
                { icon: MapPin, value: locale === 'ar' ? 'تونس العاصمة، شارع الحبيب بورقيبة' : 'Tunis, Avenue Habib Bourguiba', label: locale === 'ar' ? 'العنوان' : locale === 'fr' ? 'Adresse' : 'Address' },
              ].map(contact => {
                const Icon = contact.icon
                return (
                  <div key={contact.label} className="flex items-center gap-2 text-sm">
                    <Icon size={14} className="text-navy-600 flex-shrink-0" />
                    <span className="text-navy-500 w-16 text-xs">{contact.label}</span>
                    <span className="text-navy-800 font-medium">{contact.value}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-navy-200">
              <p className="text-xs text-navy-600">
                {locale === 'ar' ? '⏰ ساعات العمل: الإثنين–الجمعة، 9:00–17:00'
                  : locale === 'fr' ? "⏰ Heures d'ouverture : Lun–Ven, 9h00–17h00"
                  : '⏰ Office hours: Mon–Fri, 9:00–17:00'}
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
