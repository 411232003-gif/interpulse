import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths yang tidak perlu login
  const publicPaths = ['/', '/login', '/register', '/complete-profile', '/login-qr', '/_next', '/favicon.ico', '/logo-app.png', '/manifest.json', '/sw.js', '/icons', '/video',
    '/video-edukasi', '/Fasca', '/kalori-tracker', '/deteksi-jantung', '/musik-relaksasi', '/sehat-sentosa', '/monitoring', '/partisipasi', '/FOTO'
  ]

  // Cek kalau path saat ini adalah public path
  const isPublicPath = publicPaths.some(path =>
    pathname === path || pathname.startsWith('/_next/') || pathname.startsWith('/icons/') || pathname.startsWith('/video/') || pathname.startsWith('/FOTO/')
  )

  // Ambil auth token dari cookie
  const authToken = request.cookies.get('firebaseIdToken')?.value

  // Kalau belum login dan bukan public path, redirect ke login
  if (!authToken && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Biarkan user yang sudah login bisa akses login/register untuk scan QR code

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)']
}
