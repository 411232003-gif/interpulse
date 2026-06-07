'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  className?: string
  label?: string
  onClick?: () => void
}

export default function BackButton({ className = '', label = 'Kembali', onClick }: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.back()
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center justify-center p-2 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-full transition-all duration-200 ${className}`}
      title={label}
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  )
}
