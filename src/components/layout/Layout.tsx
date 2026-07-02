import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, FileText, Upload, CreditCard, Bell, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { LOCALES, Locale } from '../../lib/i18n'
import clsx from 'clsx'

const navItems = [
  { key: 'home', icon: Home, path: '/' },
  { key: 'myApplication', icon: FileText, path: '/application' },
  { key: 'documents', icon: Upload, path: '/documents' },
  { key: 'payments', icon: CreditCard, path: '/payments' },
  { key: 'profile', icon: User, path: '/profile' },
]

export default function Layout() {
  const { user } = useAuth()
  const { t, locale, changeLocale } = useLocale()
  const location = useLocation()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50" style={{ paddingBottom: '80px' }}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="FORSA" className="w-7 h-7 object-contain" />
            <span className="font-semibold text-navy-900 text-sm">FORSA</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Compact locale switcher */}
            <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
              {LOCALES.map(l => (
                <button key={l.code} onClick={() => changeLocale(l.code as Locale)}
                  className={clsx(
                    'px-2 py-1 text-xs rounded-md font-medium transition-all',
                    locale === l.code ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500'
                  )}>
                  {l.code.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Notifications */}
            <NavLink to="/notifications"
              className="relative p-2 text-gray-500 hover:text-navy-800 hover:bg-gray-50 rounded-xl transition-colors">
              <Bell size={18} />
            </NavLink>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main id="main-content" className="flex-1 max-w-lg mx-auto w-full px-4 py-5 animate-fade-in">
        <Outlet />
      </main>

      {/* Bottom navigation — mobile first */}
      <nav aria-label="Main navigation" className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 safe-area-pb">
        <div className="max-w-lg mx-auto flex">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)
            return (
              <NavLink key={item.path} to={item.path}
                className={clsx(
                  'flex-1 flex flex-col items-center gap-1 py-3 px-1 transition-colors',
                  isActive ? 'text-navy-800' : 'text-gray-400 hover:text-gray-600'
                )}>
                <div className={clsx(
                  'p-1.5 rounded-xl transition-all',
                  isActive ? 'bg-navy-50' : ''
                )}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={clsx(
                  'text-[10px] font-medium',
                  isActive ? 'text-navy-800' : 'text-gray-400'
                )}>
                  {t(item.key)}
                </span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
