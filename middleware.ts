import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths yang tidak perlu login
  const publicPaths = ['/login', '/register', '/complete-profile', '/_next', '/favicon.ico', '/logo-app.png', '/manifest.json', '/sw.js', '/icons', '/video']
  
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

  // Kalau sudah login tapi masuk ke login/register, redirect ke home
  if (authToken && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)']
}
