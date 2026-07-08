import { Link } from 'react-router-dom'
import { useLocale } from '../../hooks/useLocale'
import { LOCALES, Locale } from '../../lib/i18n'
import { Mail, ArrowLeft } from 'lucide-react'

// T-101 cleanup: the "Forgot password?" link on LoginPage used to point at this
// route with nothing behind it (App.tsx had no matching <Route>, so it silently
// fell through to the catch-all redirect to "/"). There is no password-reset
// endpoint in the backend yet (checked forsa-os/src/auth — no forgot/reset
// routes exist), so rather than fake a "check your email" flow against a
// nonexistent API, this is a minimal, honest page: it explains the situation
// and points the student at human support. Replace with a real
// request-reset -> emailed link -> set-new-password flow once the backend adds
// those endpoints.
export default function ForgotPasswordPage() {
  const { t, locale, changeLocale } = useLocale()

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex flex-col">
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="FORSA" className="w-8 h-8 object-contain" />
          <span className="text-white font-semibold">FORSA</span>
        </div>
        <div className="flex gap-1 bg-white/10 rounded-xl p-1">
          {LOCALES.map(l => (
            <button key={l.code} onClick={() => changeLocale(l.code as Locale)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                locale === l.code ? 'bg-white text-navy-900' : 'text-white/70 hover:text-white'
              }`}>
              {l.code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-white text-2xl font-bold">{t('forgotPassword')}</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-modal p-6 space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              {locale === 'ar'
                ? 'إعادة تعيين كلمة المرور عبر الإنترنت غير متاحة بعد. يرجى التواصل مع فريق دعم FORSA وسنساعدك في استعادة الوصول إلى حسابك.'
                : locale === 'fr'
                ? "La réinitialisation du mot de passe en ligne n'est pas encore disponible. Contactez l'équipe support FORSA et nous vous aiderons à récupérer l'accès à votre compte."
                : "Online password reset isn't available yet. Please contact the FORSA support team and we'll help you regain access to your account."}
            </p>

            <a href="mailto:support@forsa.tn"
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-navy-200 hover:bg-navy-50/50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center flex-shrink-0">
                <Mail size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">support@forsa.tn</p>
                <p className="text-xs text-gray-400">
                  {locale === 'ar' ? 'البريد الإلكتروني للدعم' : locale === 'fr' ? 'E-mail du support' : 'Support email'}
                </p>
              </div>
            </a>
          </div>

          <Link to="/login" className="flex items-center justify-center gap-1.5 text-center text-white/60 text-sm mt-6 hover:text-white">
            <ArrowLeft size={14} /> {t('back')}
          </Link>
        </div>
      </div>
    </div>
  )
}
