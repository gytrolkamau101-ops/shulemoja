/** Map numeric marks to letter/CBC label using grade_scale_bands. */

export function letterFromMarks(marks, bands) {
  if (marks == null || marks === '' || !bands?.length) return null
  const n = Number(marks)
  if (Number.isNaN(n)) return null
  const sorted = [...bands].sort((a, b) => Number(b.min_mark || 0) - Number(a.min_mark || 0))
  for (const b of sorted) {
    const min = Number(b.min_mark ?? b.min ?? 0)
    const max = Number(b.max_mark ?? b.max ?? 100)
    if (n >= min && n <= max) return b.grade_label || b.label || b.grade || null
  }
  return null
}

export async function loadActiveBands(supabase, schoolId) {
  if (!schoolId) return []
  const { data: scales } = await supabase
    .from('grade_scales')
    .select('id, scale_name, is_active')
    .eq('school_id', schoolId)
    .order('is_active', { ascending: false })
  const active = (scales || []).find((s) => s.is_active) || scales?.[0]
  if (!active) return []
  const { data: bands } = await supabase
    .from('grade_scale_bands')
    .select('*')
    .eq('scale_id', active.id)
  return bands || []
}
