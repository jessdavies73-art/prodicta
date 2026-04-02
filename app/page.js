import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import LandingPage from './LandingPage'

export default async function Home() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/dashboard')
  } catch {}
  return <LandingPage />
}
