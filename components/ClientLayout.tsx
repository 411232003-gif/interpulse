'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Navigation from '@/components/Navigation'
import MiniPlayer from '@/components/MiniPlayer'
import { GlobalAudioProvider } from '@/contexts/GlobalAudioContext'
import { useAuth } from '@/lib/auth-context'

const publicRoutes = ['/login', '/register', '/complete-profile']

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route))
      
      if (!user && !isPublicRoute) {
        router.push('/login')
        return
      }
      
      if (user && (pathname === '/login' || pathname === '/register')) {
        router.push('/')
        return
      }

      // Check if user has incomplete profile (no NIK) and redirect to complete-profile
      // Admin users can bypass this requirement
      if (user && userProfile && !userProfile.nik && userProfile.role !== 'admin' && pathname !== '/complete-profile' && !isPublicRoute) {
        router.push('/complete-profile')
        return
      }
    }
  }, [user, userProfile, loading, pathname, router])

  // Show loading state
  if (loading) {
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

  // For public routes (login/register), don't show navigation
  if (isPublicRoute) {
    return <>{children}</>
  }

  // For protected routes, require auth
  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <GlobalAudioProvider>
      <div className="pb-nav">
        {children}
      </div>
      <Navigation />
      <MiniPlayer />
    </GlobalAudioProvider>
  )
}
