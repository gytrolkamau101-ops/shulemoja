import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

/** Minimal school-scoped list/insert/delete. Sniper CRUD — no ceremony. */
export function useRows(table, schoolId, { order = 'created_at', limit = 200, select = '*' } = {}) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!schoolId) return
    const { data, error: e } = await supabase
      .from(table)
      .select(select)
      .eq('school_id', schoolId)
      .order(order, { ascending: false })
      .limit(limit)
    if (e) setError(e.message)
    else setRows(data || [])
  }, [table, schoolId, order, limit, select])

  useEffect(() => {
    load()
  }, [load])

  const insert = async (row) => {
    setBusy(true)
    setError('')
    const { error: e } = await supabase.from(table).insert([{ ...row, school_id: schoolId }])
    setBusy(false)
    if (e) {
      setError(e.message)
      return false
    }
    await load()
    return true
  }

  const update = async (id, patch) => {
    setError('')
    const { error: e } = await supabase.from(table).update(patch).eq('id', id)
    if (e) {
      setError(e.message)
      return false
    }
    await load()
    return true
  }

  const remove = async (id, label = 'this row') => {
    if (!confirm(`Delete ${label}?`)) return false
    setError('')
    const { error: e } = await supabase.from(table).delete().eq('id', id)
    if (e) {
      setError(e.message)
      return false
    }
    await load()
    return true
  }

  return { rows, error, setError, busy, load, insert, update, remove }
}
