'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Home, User, Activity, Heart, Flame, Music, History, PlayCircle, Grid3x3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

// Admin nav: only Beranda + Profil
const adminNavItems = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/profil', label: 'Profil', icon: User },
]

// User nav items (desktop)
const getUserMainNavItems = () => [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/Fasca', label: 'Fasca', icon: Activity },
  { href: '/kalori-tracker', label: 'Kalori', icon: Flame },
  { href: '/deteksi-jantung', label: 'Skrining', icon: Heart },
]

// User feature nav items
const getUserFeatureNavItems = () => [
  { href: '/riwayat-tensi', label: 'Riwayat', icon: History },
  { href: '/posbindu-monitoring', label: 'Absensi', icon: Activity },
  { href: '/video-edukasi', label: 'Video', icon: PlayCircle },
  { href: '/musik-relaksasi', label: 'Musik', icon: Music },
]


function NavItem({ item, isActive }: { item: any; isActive: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        'flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-2 py-1 rounded-xl transition-all active:scale-95',
        isActive
          ? 'text-orange-600 bg-orange-50'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      )}
    >
      <Icon className={cn(
        'transition-all',
        isActive ? 'w-6 h-6' : 'w-5 h-5'
      )} />
      <span className="text-[10px] font-medium mt-0.5 leading-tight">{item.label}</span>
    </Link>
  )
}


export default function Navigation() {
  const pathname = usePathname()
  const { isAdmin } = useAuth()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const isProfileActive = pathname === '/profil'

  // Admin: only Beranda + Profil
  if (isAdmin) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-bottom">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-around items-center py-2 pb-safe">
            {adminNavItems.map((item) => (
              <NavItem key={item.href} item={item} isActive={pathname === item.href} />
            ))}
          </div>
        </div>
      </nav>
    )
  }

  const mainNavItems = getUserMainNavItems()
  const featureNavItems = getUserFeatureNavItems()
  const isFeatureActive = featureNavItems.some((item: { href: string }) => pathname === item.href)

  if (!isMobile) {
    const allNavItems = [...mainNavItems, ...featureNavItems, { href: '/profil', label: 'Profil', icon: User }]
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-bottom">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-around items-center py-2 pb-safe">
            {allNavItems.map((item: { href: string; label: string; icon: any }) => (
              <NavItem key={item.href} item={item} isActive={pathname === item.href} />
            ))}
          </div>
        </div>
      </nav>
    )
  }

  // Mobile view - Beranda, Tips, Profil
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-bottom">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-around items-center py-2 pb-safe relative">
          <Link
            href="/"
            className={cn(
              'flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-2 py-1 transition-all active:scale-95',
              pathname === '/' ? 'text-teal-600' : 'text-gray-500'
            )}
          >
            <Home className={cn('transition-all', pathname === '/' ? 'w-6 h-6' : 'w-5 h-5')} />
            <span className="text-[10px] font-medium mt-0.5 leading-tight">Beranda</span>
          </Link>

          <Link
            href="/tips"
            className={cn(
              'flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-2 py-1 transition-all active:scale-95',
              pathname === '/tips' || isFeatureActive ? 'text-teal-600' : 'text-gray-500'
            )}
          >
            <Grid3x3 className={cn('transition-all', pathname === '/tips' || isFeatureActive ? 'w-6 h-6' : 'w-5 h-5')} />
            <span className="text-[10px] font-medium mt-0.5 leading-tight">Tips</span>
          </Link>

          <Link
            href="/profil"
            className={cn(
              'flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-2 py-1 transition-all active:scale-95',
              isProfileActive ? 'text-teal-600' : 'text-gray-500'
            )}
          >
            <User className={cn('transition-all', isProfileActive ? 'w-6 h-6' : 'w-5 h-5')} />
            <span className="text-[10px] font-medium mt-0.5 leading-tight">Profil</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
