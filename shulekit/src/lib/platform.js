import { supabase } from '../supabaseClient'

function normalizeValue(value) {
  if (value == null) return null
  if (typeof value === 'string') {
    const s = value.trim()
    if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
      try {
        return JSON.parse(s)
      } catch {
        return value
      }
    }
  }
  return value
}

export async function getSetting(key) {
  const { data, error } = await supabase.from('platform_settings').select('value').eq('key', key).maybeSingle()
  if (error) {
    console.warn('getSetting', key, error.message)
    return null
  }
  return normalizeValue(data?.value)
}

export async function getSettings(keys) {
  const { data, error } = await supabase.from('platform_settings').select('key, value').in('key', keys)
  if (error) {
    console.warn('getSettings', error.message)
    return {}
  }
  const map = {}
  ;(data || []).forEach((r) => {
    map[r.key] = normalizeValue(r.value)
  })
  return map
}

export async function saveSetting(key, value) {
  const { data, error } = await supabase
    .from('platform_settings')
    .upsert(
      {
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
    .select('key, updated_at')
    .maybeSingle()
  if (error) throw error
  return data
}
