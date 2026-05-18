import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths yang tidak perlu login
  const publicPaths = ['/', '/login', '/register', '/complete-profile', '/login-qr', '/_next', '/favicon.ico', '/logo-app.png', '/manifest.json', '/sw.js', '/icons', '/video']

  // Cek kalau path saat ini adalah public path
  const isPublicPath = publicPaths.some(path =>
    pathname === path || pathname.startsWith('/_next/') || pathname.startsWith('/icons/') || pathname.startsWith('/video/')
  )

  // Ambil auth token dari cookie
  const authToken = request.cookies.get('firebaseIdToken')?.value

  // Kalau belum login dan bukan public path, redirect ke login
  if (!authToken && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Biarkan user yang sudah login bisa akses login/register untuk scan QR code

  // Add CSP headers to allow reCAPTCHA
  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', "frame-src 'self' https://www.google.com https://www.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://apis.google.com https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;")

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)']
}
