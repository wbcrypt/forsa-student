import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { studentApi } from '../../lib/api'
import { Card, Spinner, Alert, FormField } from '../../components/ui'
import { LOCALES, Locale } from '../../lib/i18n'
import { User, Globe, Shield, LogOut, ChevronRight, Pencil } from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

const ACADEMIC_LEVELS = [
  { value: '', label: '—' },
  { value: 'terminale', label: 'Terminale (Bac)' },
  { value: 'licence_1', label: 'Licence 1' },
  { value: 'licence_2', label: 'Licence 2' },
  { value: 'licence_3', label: 'Licence 3' },
  { value: 'master_1', label: 'Master 1' },
  { value: 'master_2', label: 'Master 2' },
  { value: 'ingenieur', label: 'Ingénieur' },
  { value: 'doctorat', label: 'Doctorat' },
]

const NATIONALITIES = [
  { value: '', label: '—' },
  { value: 'TN', label: 'Tunisian' },
  { value: 'FR', label: 'French' },
  { value: 'DZ', label: 'Algerian' },
  { value: 'MA', label: 'Moroccan' },
  { value: 'LY', label: 'Libyan' },
]

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const { t, locale, changeLocale } = useLocale()
  const qc = useQueryClient()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ phonePrimary: '', city: '', nationality: '', dateOfBirth: '', academicLevel: '' })

  const { data: student, isLoading } = useQuery({
    queryKey: ['student-me', user?.id],
    queryFn: () => studentApi.getMe().then(r => r.data),
    enabled: !!user?.id,
  })

  useEffect(() => {
    if (student) {
      setForm({
        phonePrimary: student.phone_primary || '',
        city: student.city || '',
        nationality: student.nationality?.trim() || '',
        dateOfBirth: student.date_of_birth ? student.date_of_birth.slice(0, 10) : '',
        academicLevel: student.academic_level || '',
      })
    }
  }, [student])

  const updateMutation = useMutation({
    mutationFn: () => studentApi.updateMe(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-me'] })
      setEditing(false)
    },
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User size={16} className="text-navy-700" />
            <p className="text-sm font-semibold text-gray-900">{t('personalInfo')}</p>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-xs font-semibold text-navy-700 flex items-center gap-1">
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>

        {!editing ? (
          <div className="space-y-3">
            {[
              { label: t('firstName'), value: student?.first_name || '—' },
              { label: t('lastName'), value: student?.last_name || '—' },
              { label: t('emailAddress'), value: student?.email || user?.email || '—' },
              { label: t('phone'), value: student?.phone_primary || '—' },
              { label: 'City', value: student?.city || '—' },
              { label: 'Nationality', value: NATIONALITIES.find(n => n.value === student?.nationality?.trim())?.label || student?.nationality || '—' },
              { label: 'Academic Level', value: ACADEMIC_LEVELS.find(l => l.value === student?.academic_level)?.label || '—' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-medium text-gray-900 capitalize">{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {updateMutation.isError && (
              <Alert type="error" message="Failed to save. Please try again." />
            )}
            <FormField label={t('phone')}>
              <input className="input" value={form.phonePrimary}
                onChange={e => setForm(f => ({ ...f, phonePrimary: e.target.value }))} />
            </FormField>
            <FormField label="City">
              <input className="input" value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </FormField>
            <FormField label="Nationality">
              <select className="input" value={form.nationality}
                onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}>
                {NATIONALITIES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </FormField>
            <FormField label="Date of Birth">
              <input type="date" className="input" value={form.dateOfBirth}
                onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
            </FormField>
            <FormField label="Academic Level">
              <select className="input" value={form.academicLevel}
                onChange={e => setForm(f => ({ ...f, academicLevel: e.target.value }))}>
                {ACADEMIC_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </FormField>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(false)} className="btn-secondary flex-1 text-sm py-2">
                {t('cancel')}
              </button>
              <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
                className="btn-teal flex-1 text-sm py-2">
                {updateMutation.isPending ? '...' : t('save')}
              </button>
            </div>
          </div>
        )}
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
