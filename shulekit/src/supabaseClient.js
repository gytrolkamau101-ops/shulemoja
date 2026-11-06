import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

export const supabaseConfigError = (() => {
  if (!url || !key) {
    return 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Create .env in the project root and restart npm run dev.'
  }
  if (url.includes('YOUR-PROJECT') || key.includes('YOUR-ANON')) {
    return 'Replace placeholder values in .env with your real Supabase URL and anon key, then restart npm run dev.'
  }
  if (!url.startsWith('https://') || !url.includes('supabase.co')) {
    return `VITE_SUPABASE_URL looks invalid: ${url}`
  }
  return null
})()

if (supabaseConfigError) {
  console.error('ShuleMoja:', supabaseConfigError)
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
