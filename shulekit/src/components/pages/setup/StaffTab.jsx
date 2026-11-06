import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../supabaseClient'
import { Card, Scroll, Alert, input, btn, btnGreen, btnGhost, th, td, fmt } from '../../ui'
import { logAudit } from '../../../lib/audit'

export default function StaffTab({ school, user }) {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [busy, setBusy] = useState(false)

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('school_id', school?.id)
      .order('full_name')
    setStaff(data || [])
    setLoading(false)
  }, [school?.id])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  const setStatus = async (id, status) => {
    setError('')
    const { error } = await supabase.from('users').update({ status }).eq('id', id)
    if (error) return setError(error.message)
    fetchStaff()
  }

  const changeRole = async (id, role) => {
    setError('')
    const { error } = await supabase.from('users').update({ role }).eq('id', id)
    if (error) return setError(error.message)
    fetchStaff()
  }

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const bulkStatus = async (status) => {
    if (!selectedIds.size) return
    if (!confirm(`Set ${selectedIds.size} staff account(s) to ${status}?`)) return
    setBusy(true)
    setError('')
    for (const id of selectedIds) {
      if (id === user?.id) continue
      const { error } = await supabase.from('users').update({ status }).eq('id', id)
      if (error) setError(error.message)
    }
    setSelectedIds(new Set())
    setBusy(false)
    fetchStaff()
  }


  return (
    <div className="space-y-3">
    {selectedIds.size > 0 && (
        <div className="flex flex-wrap gap-2 items-center p-3 rounded-xl bg-amber-50 border border-amber-200">
          <span className="text-sm font-bold text-amber-950">{selectedIds.size} selected</span>
          <button type="button" disabled={busy} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-black" onClick={() => bulkStatus('inactive')}>Deactivate</button>
          <button type="button" disabled={busy} className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-black" onClick={() => bulkStatus('active')}>Activate</button>
        </div>
      )}
      <Card title="Staff accounts" className="!p-0">
      <div className="p-4">
        <p className="text-sm text-gray-600 mb-3">
          Share your school code with new staff so they can register and join. Approve them here before
          they can see any school data.
        </p>
        <p className="font-semibold text-gray-800">
          School code: <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{school.school_code}</span>
        </p>
      </div>
      <Alert>{error}</Alert>
      {loading ? (
        <p className="p-6 text-gray-600">Loading...</p>
      ) : (
        <Scroll>
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className={th}></th>
                <th className={th}>Name</th>
                <th className={th}>Email</th>
                <th className={th}>Role</th>
                <th className={th}>Status</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className={td}><input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggle(s.id)} /></td><td className={td}>{s.full_name}</td>
                  <td className={td}>{s.email}</td>
                  <td className={td}>{s.role}</td>
                  <td className={td}>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        s.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : s.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className={`${td} space-x-3`}>
                    {s.id === user.id ? (
                      <span className="text-gray-400 text-sm">You</span>
                    ) : (
                      <>
                        {s.status !== 'active' && (
                          <button onClick={() => setStatus(s.id, 'active')} className="text-green-700 hover:underline text-sm">
                            Approve
                          </button>
                        )}
                        {s.status !== 'suspended' && (
                          <button onClick={() => setStatus(s.id, 'suspended')} className="text-red-600 hover:underline text-sm">
                            Suspend
                          </button>
                        )}
                        {user?.role === 'Principal' && (
                          <select
                            className="text-xs border rounded px-1 py-0.5 ml-1"
                            value={s.role}
                            onChange={(e) => changeRole(s.id, e.target.value)}
                          >
                            <option>Teacher</option>
                            <option>Secretary</option>
                            <option>Senior Teacher</option>
                            <option>Deputy Principal</option>
                            <option>Principal</option>
                          </select>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
      )}
    </Card>
    </div>
  )
}
