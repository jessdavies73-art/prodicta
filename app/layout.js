import { Outfit, IBM_Plex_Mono } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono'
})

export const metadata = {
  title: 'Prodicta — Predict probation outcomes before you hire',
  description: 'Prodicta helps UK businesses predict whether candidates will pass their probation period using AI-powered work simulations.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
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
        {children}
      </body>
    </html>
  )
}
