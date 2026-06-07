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
      className={`inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 hover:text-gray-900 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="font-medium">{label}</span>
    </button>
  )
}
