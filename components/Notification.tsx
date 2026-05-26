'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number
}

interface NotificationProps {
  notification: Notification
  onClose: (id: string) => void
}

const NotificationItem = ({ notification, onClose }: NotificationProps) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose(notification.id), 300)
    }, notification.duration || 4000)
    return () => clearTimeout(timer)
  }, [notification.id, notification.duration, onClose])

  const icons = {
    success: <CheckCircle className="w-6 h-6 text-green-500" />,
    error: <XCircle className="w-6 h-6 text-red-500" />,
    warning: <AlertCircle className="w-6 h-6 text-yellow-500" />,
    info: <Info className="w-6 h-6 text-blue-500" />
  }

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  }

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className={`bg-white rounded-2xl shadow-2xl border-2 ${bgColors[notification.type]} p-4 min-w-[320px] max-w-md`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {icons[notification.type]}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 text-sm mb-1">
              {notification.title}
            </h4>
            <p className="text-sm text-gray-600">
              {notification.message}
            </p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false)
              setTimeout(() => onClose(notification.id), 300)
            }}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Tutup notifikasi"
            title="Tutup"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NotificationContainer() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString()
    setNotifications(prev => [...prev, { ...notification, id }])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // Expose function globally
  useEffect(() => {
    ;(window as any).showNotification = addNotification
  }, [])

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {notifications.map(notification => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationItem
            notification={notification}
            onClose={removeNotification}
          />
        </div>
      ))}
    </div>
  )
}
