'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Navigation from '@/components/Navigation'
import MiniPlayer from '@/components/MiniPlayer'
import { GlobalAudioProvider } from '@/contexts/GlobalAudioContext'
import { useAuth } from '@/lib/auth-context'

const publicRoutes = [
  '/login', '/register', '/login-qr'
]

const noNavRoutes = [
  '/video-edukasi', '/Fasca', '/kalori-tracker', '/deteksi-jantung', '/musik-relaksasi', '/sehat-sentosa', '/monitoring', '/partisipasi'
]

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading, isGuest } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route))
      
      if (!user && !isGuest && !isPublicRoute) {
        router.push('/login')
        return
      }
      
      if (user && (pathname === '/login' || pathname === '/register')) {
        router.push('/')
        return
      }
    }
  }, [user, userProfile, loading, pathname, router, isGuest])

  // Show loading state only on initial load, not on navigation
  if (loading && pathname === '/') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route))
  const isNoNavRoute = noNavRoutes.some(route => pathname?.startsWith(route))
  const shouldShowNav = !isPublicRoute && !isNoNavRoute

  // For public routes (login/register), don't show navigation but wrap with audio provider
  if (isPublicRoute) {
    return (
      <GlobalAudioProvider>
        {children}
      </GlobalAudioProvider>
    )
  }

  // For protected routes, require auth (guest can access homepage)
  if (!user && !isGuest) {
    return null // Will redirect in useEffect
  }

  return (
    <GlobalAudioProvider>
      <div className={shouldShowNav ? 'pb-nav' : ''}>
        {children}
      </div>
      {shouldShowNav && <Navigation />}
      <MiniPlayer />
    </GlobalAudioProvider>
  )
}
