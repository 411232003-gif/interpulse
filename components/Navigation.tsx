'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Home, User, Activity, Heart, Flame, Music, History, PlayCircle, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Item utama yang selalu tampil (mobile)
const mainNavItems = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/catat-kesehatan', label: 'Fasca', icon: Activity },
  { href: '/kalori-tracker', label: 'Kalori', icon: Flame },
  { href: '/deteksi-jantung', label: 'Skrining', icon: Heart },
]

// Item tambahan untuk menu dropdown
const moreNavItems = [
  { href: '/riwayat-tensi', label: 'Riwayat', icon: History },
  { href: '/video-edukasi', label: 'Video', icon: PlayCircle },
  { href: '/musik-relaksasi', label: 'Musik', icon: Music },
  { href: '/profil', label: 'Profil', icon: User },
]

// Semua item untuk desktop
const allNavItems = [...mainNavItems, ...moreNavItems]

function NavItem({ item, isActive }: { item: typeof mainNavItems[0]; isActive: boolean }) {
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

function DropdownItem({ item, isActive, onClick }: { item: typeof mainNavItems[0]; isActive: boolean; onClick?: () => void }) {
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

  // Check if any dropdown item is active
  const isMoreActive = moreNavItems.some(item => pathname === item.href)

  if (!isMobile) {
    // Desktop view - show all items
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

  // Mobile view - show main items + dropdown
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-bottom">
      <div className="max-w-lg mx-auto px-2">
        <div className="flex justify-around items-center py-2 pb-safe">
          {mainNavItems.map((item) => (
            <NavItem key={item.href} item={item} isActive={pathname === item.href} />
          ))}

          {/* Dropdown Menu Button */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn(
                'flex flex-col items-center justify-center min-w-[64px] min-h-[56px] px-2 py-1 rounded-xl transition-all active:scale-95',
                isMoreActive
                  ? 'text-orange-600 bg-orange-50'
                  : isDropdownOpen
                    ? 'text-orange-600 bg-orange-100'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {isDropdownOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
              <span className="text-[10px] font-medium mt-0.5 leading-tight">
                {isDropdownOpen ? 'Tutup' : 'Lainnya'}
              </span>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                <div className="p-2 space-y-1">
                  {moreNavItems.map((item) => (
                    <DropdownItem
                      key={item.href}
                      item={item}
                      isActive={pathname === item.href}
                      onClick={() => setIsDropdownOpen(false)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
