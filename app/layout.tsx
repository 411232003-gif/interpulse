import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ClientLayout from '@/components/ClientLayout'
import { AuthProvider } from '@/lib/auth-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'InterPulse - Aplikasi Kesehatan Fisik',
  description: 'Menggabungkan Internal dan Pulse untuk kesehatan fisik yang optimal',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo-app.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/logo-app.png', sizes: '512x512', type: 'image/png' }
    ]
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        {/* PWA Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#00008B" />
        <meta name="background-color" content="#00008B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="InterPulse" />
        <meta name="application-name" content="InterPulse" />
        <meta name="msapplication-TileColor" content="#00008B" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* PWA Icons - Only use logo-app.png */}
        <link rel="icon" type="image/png" href="/logo-app.png" />
        <link rel="apple-touch-icon" href="/logo-app.png" />
        <link rel="shortcut icon" type="image/png" href="/logo-app.png" />
        
        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Service Worker - Temporarily disabled to fix cache issues */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                // Unregister semua service worker untuk clear cache
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    console.log('[InterPulse] Unregistering SW:', registration.scope);
                    registration.unregister();
                  }
                });
              });
            }
          `
        }} />
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </AuthProvider>
      </body>
    </html>
  )
}
