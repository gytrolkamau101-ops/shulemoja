/** Flush offline queue against Supabase — same tables/RLS as online writes */

export function buildOfflineHandlers(supabase) {
  return {
    attendance_upsert: async ({ rows }) => {
      if (!rows?.length) return
      const { error } = await supabase.from('attendance').upsert(rows, {
        onConflict: 'school_id,student_id,date',
      })
      if (error) throw error
    },
    exam_results_upsert: async ({ rows }) => {
      if (!rows?.length) return
      const { error } = await supabase.from('exam_results').upsert(rows, {
        onConflict: 'exam_id,student_id,subject_id',
      })
      if (error) throw error
    },
    fee_payment: async (row) => {
      if (!row) return
      const { error } = await supabase.from('fee_payments').insert([row])
      if (error) throw error
    },
  }
}
