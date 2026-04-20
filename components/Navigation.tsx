'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Home, User, Activity, Heart, Flame, Music, History, PlayCircle, Grid3x3, X, Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

// Item utama yang selalu tampil (desktop)
const getMainNavItems = (isAdmin: boolean) => [
  { href: '/', label: 'Beranda', icon: Home },
  // Fasca hanya muncul untuk user biasa, tidak untuk admin
  ...(isAdmin ? [] : [{ href: '/Fasca', label: 'Fasca', icon: Activity }]),
  { href: '/kalori-tracker', label: 'Kalori', icon: Flame },
  { href: '/deteksi-jantung', label: 'Skrining', icon: Heart },
]

// Item tambahan untuk menu dropdown (fitur)
const getFeatureNavItems = (isAdmin: boolean) => [
  // Fasca hanya muncul untuk user biasa, tidak untuk admin
  ...(isAdmin ? [] : [{ href: '/Fasca', label: 'Fasca', icon: Activity }]),
  { href: '/kalori-tracker', label: 'Kalori', icon: Flame },
  { href: '/deteksi-jantung', label: 'Skrining', icon: Heart },
  // Riwayat hanya muncul untuk user biasa, tidak untuk admin
  ...(isAdmin ? [] : [{ href: '/riwayat-tensi', label: 'Riwayat', icon: History }]),
  { href: '/posbindu-monitoring', label: isAdmin ? 'Posbindu' : 'Absensi', icon: Activity },
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

function DropdownItem({ item, isActive, onClick }: { item: { href: string; label: string; icon: any }; isActive: boolean; onClick?: () => void }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
        isActive
          ? 'text-orange-600 bg-orange-50'
          : 'text-gray-600 hover:bg-gray-50'
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{item.label}</span>
    </Link>
  )
}

export default function Navigation() {
  const pathname = usePathname()
  const { isAdmin } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    // Close dropdown when route changes
    setIsDropdownOpen(false)
  }, [pathname])

  // Get dynamic nav items based on admin role
  const mainNavItems = getMainNavItems(isAdmin)
  const featureNavItems = getFeatureNavItems(isAdmin)

  // Check if any dropdown item is active
  const isFeatureActive = featureNavItems.some(item => pathname === item.href)
  const isProfileActive = pathname === '/profil'

  if (!isMobile) {
    // Desktop view - show all items (filter out duplicates from featureNavItems to avoid duplicate keys)
    const filteredFeatureNavItems = featureNavItems.filter(item => 
      item.href !== '/Fasca' && 
      item.href !== '/kalori-tracker' && 
      item.href !== '/deteksi-jantung'
    )
    const allNavItems = [...mainNavItems, ...filteredFeatureNavItems, { href: '/profil', label: 'Profil', icon: User }]
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-bottom">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-around items-center py-2 pb-safe">
            {allNavItems.map((item) => (
              <NavItem key={item.href} item={item} isActive={pathname === item.href} />
            ))}
          </div>
        </div>
      </nav>
    )
  }

  // Mobile view - show 3 buttons: Beranda, Fitur (page), Profil

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-bottom">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-around items-center py-2 pb-safe relative">
          {/* Beranda Button */}
          <Link
            href="/"
            className={cn(
              'flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-2 py-1 transition-all active:scale-95',
              pathname === '/'
                ? 'text-teal-600'
                : 'text-gray-500'
            )}
          >
            <Home className={cn(
              'transition-all',
              pathname === '/' ? 'w-6 h-6' : 'w-5 h-5'
            )} />
            <span className="text-[10px] font-medium mt-0.5 leading-tight">Beranda</span>
          </Link>

          {/* Tips Button */}
          <Link
            href="/tips"
            className={cn(
              'flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-2 py-1 transition-all active:scale-95',
              pathname === '/tips' || isFeatureActive
                ? 'text-teal-600'
                : 'text-gray-500'
            )}
          >
            <Grid3x3 className={cn(
              'transition-all',
              pathname === '/tips' || isFeatureActive ? 'w-6 h-6' : 'w-5 h-5'
            )} />
            <span className="text-[10px] font-medium mt-0.5 leading-tight">Tips</span>
          </Link>

          {/* Profil Button */}
          <Link
            href="/profil"
            className={cn(
              'flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-2 py-1 transition-all active:scale-95',
              isProfileActive
                ? 'text-teal-600'
                : 'text-gray-500'
            )}
          >
            <User className={cn(
              'transition-all',
              isProfileActive ? 'w-6 h-6' : 'w-5 h-5'
            )} />
            <span className="text-[10px] font-medium mt-0.5 leading-tight">Profil</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
