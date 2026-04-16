import { Outfit, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import ToastProvider from '@/components/ToastProvider'
import PageTransition from '@/components/PageTransition'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono'
})

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#00BFA5',
}

export const metadata = {
  title: {
    default: 'PRODICTA',
    template: '%s | PRODICTA',
  },
  description: 'The Hiring Decision Engine with built-in Probation Insurance. Prodicta helps UK businesses identify whether candidates will succeed through probation using AI-powered work simulations.',
  icons: {
    icon: '/icon-192.svg',
    apple: '/icon-192.png',
    shortcut: '/icon-192.svg',
  },
  manifest: '/manifest.json',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'PRODICTA',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}`,
          }}
        />
      </head>
      <body
        className={`${outfit.variable} ${ibmPlexMono.variable}`}
        style={{
          margin: 0,
          padding: 0,
          background: '#f7f9fb',
          fontFamily: "'Outfit', system-ui, sans-serif",
          color: '#0f172a'
        }}
      >
        <ToastProvider>
          <PageTransition>
            {children}
          </PageTransition>
        </ToastProvider>
      </body>
    </html>
  )
}
