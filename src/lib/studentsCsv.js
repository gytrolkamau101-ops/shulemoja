/** CSV helpers for Students page — keeps page thinner and testable */

export function nullIfEmpty(v) {
  return v === '' || v == null ? null : v
}

export function studentsToNemisCsv(students, byGradeLabel) {
  const header = ['admission_no', 'first_name', 'last_name', 'gender', 'grade', 'parent_phone']
  const lines = [header.join(',')]
  for (const s of students) {
    const row = [
      s.admission_no || '',
      s.first_name || '',
      s.last_name || '',
      s.gender || '',
      byGradeLabel(s) || '',
      s.parent_phone || '',
    ].map((x) => `"${String(x).replace(/"/g, '""')}"`)
    lines.push(row.join(','))
  }
  return lines.join('\n')
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
