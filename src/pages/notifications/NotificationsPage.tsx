import React from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { useLocale } from '../../hooks/useLocale'
import { Card, Spinner, EmptyState } from '../../components/ui'
import { Bell, CheckCircle, AlertTriangle, Info, CreditCard, FileText } from 'lucide-react'
import { format } from 'date-fns'

const NOTIF_ICONS: Record<string, React.ElementType> = {
  payment: CreditCard,
  application: FileText,
  document: FileText,
  system: Info,
  alert: AlertTriangle,
}

export default function NotificationsPage() {
  const { t } = useLocale()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
  })

  const notifications = Array.isArray(data) ? data : (data?.data || [])

  const getIcon = (type: string) => {
    const Icon = NOTIF_ICONS[type] || Bell
    return Icon
  }

  const getColor = (type: string, priority: string) => {
    if (priority === 'high') return 'bg-red-50 text-red-500'
    if (type === 'payment') return 'bg-green-50 text-green-500'
    if (type === 'application') return 'bg-blue-50 text-blue-500'
    return 'bg-gray-50 text-gray-500'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="section-title">{t('notifications')}</h1>
        {notifications.length > 0 && (
          <span className="text-xs bg-navy-800 text-white px-2.5 py-1 rounded-full font-medium">
            {notifications.length}
          </span>
        )}
      </div>

      {isLoading ? <Spinner className="h-40" /> : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={locale === 'ar' ? 'لا توجد إشعارات' : locale === 'fr' ? 'Aucune notification' : 'No notifications'}
          description={locale === 'ar' ? 'أنت في صدارة الأمور! ستظهر هنا تحديثات الطلب وتذكيرات الدفع.' : locale === 'fr' ? 'Vous êtes à jour ! Les mises à jour de dossier et rappels de paiement apparaîtront ici.' : "You're all caught up! Application updates and payment reminders will appear here."}
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => {
            const Icon = getIcon(n.type || 'system')
            const color = getColor(n.type, n.priority)
            return (
              <Card key={n.id} className={`transition-all ${!n.read_at ? 'border-s-4 border-s-navy-800' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.read_at ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {n.title || n.subject || 'Notification'}
                    </p>
                    {n.body && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5">
                      {n.created_at ? format(new Date(n.created_at), 'dd MMM yyyy · HH:mm') : '—'}
                    </p>
                  </div>
                  {!n.read_at && (
                    <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
