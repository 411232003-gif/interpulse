'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Home, User, Activity, Heart, Flame, Music, History, PlayCircle, Grid3x3, BarChart3, TrendingUp, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

// Admin nav: Beranda + Monev Posbindu + Profil
const adminNavItems = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/monev-posbindu', label: 'Monev Posbindu', icon: BarChart3 },
  { href: '/profil', label: 'Profil', icon: User },
]

// User nav items (desktop)
const getUserMainNavItems = () => [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/fasca-catatan', label: 'FASCA', icon: FileText },
  { href: '/trafik-user', label: 'Riwayat Pemeriksaan', icon: TrendingUp },
  { href: '/kalori-tracker', label: 'Kalori', icon: Flame },
  { href: '/deteksi-jantung', label: 'Skrining', icon: Heart },
]

// User feature nav items
const getUserFeatureNavItems = () => [
  { href: '/riwayat-tensi', label: 'Kesehatan', icon: History },
  { href: '/video-edukasi', label: 'Video', icon: PlayCircle },
  { href: '/musik-relaksasi', label: 'Musik', icon: Music },
  { href: '/fasca-catatan', label: 'FASCA', icon: FileText },
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
    const desktopNavItems = [
      { href: '/', label: 'Beranda', icon: Home },
      { href: '/fitur', label: 'Fitur', icon: Grid3x3 },
      { href: '/profil', label: 'Profil', icon: User }
    ]
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-bottom">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-around items-center py-2 pb-safe">
            {desktopNavItems.map((item: { href: string; label: string; icon: any }) => (
              <NavItem key={item.href} item={item} isActive={pathname === item.href} />
            ))}
          </div>
        </div>
      </nav>
    )
  }

  // Mobile view - Beranda, Fitur, Profil
  const mobileNavItems = [
    { href: '/', label: 'Beranda', icon: Home },
    { href: '/fitur', label: 'Fitur', icon: Grid3x3 },
    { href: '/profil', label: 'Profil', icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-bottom">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-around items-center py-2 pb-safe relative">
          {mobileNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-2 py-1 transition-all active:scale-95',
                pathname === item.href ? 'text-teal-600' : 'text-gray-500'
              )}
            >
              <item.icon className={cn('transition-all', pathname === item.href ? 'w-6 h-6' : 'w-5 h-5')} />
              <span className="text-[10px] font-medium mt-0.5 leading-tight">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
