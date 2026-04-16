'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  className?: string
  label?: string
}

export default function BackButton({ className = '', label = 'Kembali' }: BackButtonProps) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.back()}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="font-medium">{label}</span>
    </button>
  )
}
