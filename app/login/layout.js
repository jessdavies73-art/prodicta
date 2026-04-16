export const metadata = {
  title: 'Login',
  description: 'Sign in to your PRODICTA account to create assessments, review candidate reports, and manage your hiring pipeline.',
  alternates: { canonical: 'https://prodicta.co.uk/login' },
  openGraph: {
    title: 'Login | PRODICTA',
    description: 'Sign in to your PRODICTA account to create assessments and manage your hiring pipeline.',
    type: 'website',
    url: 'https://prodicta.co.uk/login',
    siteName: 'PRODICTA',
    locale: 'en_GB',
  },
}

export default function LoginLayout({ children }) {
  return children
}
