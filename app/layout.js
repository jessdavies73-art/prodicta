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
}

export const metadata = {
  title: 'PRODICTA',
  description: 'Prodicta helps UK businesses identify whether candidates will succeed through probation using AI-powered work simulations.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
