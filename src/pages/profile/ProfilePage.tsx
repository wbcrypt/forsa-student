import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { studentApi } from '../../lib/api'
import { Card, Spinner, Alert } from '../../components/ui'
import { LOCALES, Locale } from '../../lib/i18n'
import { User, Globe, Shield, LogOut, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const { t, locale, changeLocale } = useLocale()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const { data: student, isLoading } = useQuery({
    queryKey: ['student-me', user?.id],
    queryFn: () => studentApi.getMe().then(r => r.data),
    enabled: !!user?.id,
  })

  if (isLoading) return <Spinner className="h-64" />

  const displayName = student ? `${student.first_name} ${student.last_name}` : user?.email?.split('@')[0] || 'Student'

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-navy-700 to-navy-900 rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-2xl">
            {displayName[0]?.toUpperCase()}
          </span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
          <p className="text-sm text-gray-500">{user?.email}</p>
          {student?.city && (
            <p className="text-xs text-gray-400 mt-0.5">📍 {student.city}</p>
          )}
        </div>
      </div>

      {/* Personal info */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-navy-700" />
          <p className="text-sm font-semibold text-gray-900">{t('personalInfo')}</p>
        </div>
        <div className="space-y-3">
          {[
            { label: t('firstName'), value: student?.first_name || '—' },
            { label: t('lastName'), value: student?.last_name || '—' },
            { label: t('emailAddress'), value: student?.email || user?.email || '—' },
            { label: t('phone'), value: student?.phone_primary || '—' },
            { label: 'City', value: student?.city || '—' },
            { label: 'Nationality', value: student?.nationality || '—' },
            { label: 'Academic Level', value: student?.academic_level?.replace(/_/g, ' ') || '—' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500">{item.label}</span>
              <span className="text-sm font-medium text-gray-900 capitalize">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* FORSA Score */}
      {student?.aggregate_score && (
        <Card className="bg-gradient-to-br from-navy-800 to-navy-900 border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs font-medium uppercase tracking-wide">{t('scoreLabel')}</p>
              <p className="text-4xl font-bold text-white mt-1">{student.aggregate_score}</p>
              <p className="text-teal-400 text-sm font-medium mt-1 capitalize">
                {student.score_band?.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="w-20 h-20 relative">
              <svg viewBox="0 0 80 80" className="rotate-[-90deg]">
                <circle cx="40" cy="40" r="34" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="8" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="#00C4C8" strokeWidth="8"
                  strokeDasharray={`${((student.aggregate_score - 300) / 700) * 213.6} 213.6`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-xs font-semibold">/1000</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Language */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-navy-700" />
          <p className="text-sm font-semibold text-gray-900">{t('language')}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {LOCALES.map(l => (
            <button key={l.code} onClick={() => changeLocale(l.code as Locale)}
              className={clsx(
                'py-3 px-3 rounded-xl border text-sm font-medium transition-all text-center',
                locale === l.code
                  ? 'border-navy-800 bg-navy-800 text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              )}>
              <div>{l.flag}</div>
              <div className="text-xs mt-1">{l.label}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Account settings */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-navy-700" />
          <p className="text-sm font-semibold text-gray-900">{t('accountSettings')}</p>
        </div>
        <div className="space-y-1">
          {[
            { label: 'User ID', value: user?.id?.split('-')[0] + '...' },
            { label: 'Account Status', value: 'Active' },
            { label: '57 Permissions', value: 'Standard access' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-gray-500">{item.label}</span>
              <span className="text-xs text-gray-400">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Sign out */}
      {!showLogoutConfirm ? (
        <button onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center justify-between p-4 card text-red-600 hover:bg-red-50 hover:border-red-100 transition-all">
          <div className="flex items-center gap-3">
            <LogOut size={18} />
            <span className="text-sm font-medium">{t('signOut')}</span>
          </div>
          <ChevronRight size={14} />
        </button>
      ) : (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-800 mb-3">Are you sure you want to sign out?</p>
          <div className="flex gap-3">
            <button onClick={() => setShowLogoutConfirm(false)} className="btn-secondary flex-1 text-sm py-2">
              {t('cancel')}
            </button>
            <button onClick={logout} className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors">
              {t('signOut')}
            </button>
          </div>
        </Card>
      )}

      <p className="text-center text-xs text-gray-300 pb-2">FORSA OS v1.0 · Student Portal</p>
    </div>
  )
}
