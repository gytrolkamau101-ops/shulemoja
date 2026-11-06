import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../supabaseClient'
import { Card, Scroll, Alert, input, btn, btnGreen, btnGhost, th, td, fmt } from '../../ui'
import { logAudit } from '../../../lib/audit'

export default function ParentsTab({ school }) {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('parent_children')
      .select('*, parents(full_name, email, phone, status), students(admission_no, first_name, last_name)')
      .eq('school_id', school?.id)
      .order('created_at', { ascending: false })
    setLinks(data || [])
    setLoading(false)
  }, [school?.id])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  const decide = async (link, approve) => {
    setError('')
    setBusyId(link.id)
    const { error: linkErr } = await supabase
      .from('parent_children')
      .update({ status: approve ? 'approved' : 'rejected' })
      .eq('id', link.id)
    if (!linkErr && approve) {
      await supabase.from('parents').update({ status: 'active' }).eq('id', link.parent_id)
    }
    setBusyId(null)
    if (linkErr) return setError(linkErr.message)
    fetchLinks()
  }

  return (
    <Card title="Parent sign-up requests" className="!p-0">
      <div className="p-4">
        <p className="text-sm text-gray-600">
          A parent only sees their child's records after you approve the link below. Check that
          the admission number genuinely matches the parent before approving.
        </p>
      </div>
      <Alert>{error}</Alert>
      {loading ? (
        <p className="p-6 text-gray-600">Loading...</p>
      ) : links.length === 0 ? (
        <p className="p-6 text-gray-600 text-center">No parent sign-ups yet</p>
      ) : (
        <Scroll>
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className={th}>Parent</th>
                <th className={th}>Contact</th>
                <th className={th}>Claims child</th>
                <th className={th}>Status</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id} className="border-b">
                  <td className={td}>{l.parents?.full_name}</td>
                  <td className={td}>{l.parents?.email}</td>
                  <td className={td}>
                    {l.students?.admission_no} &mdash; {l.students?.first_name} {l.students?.last_name}
                  </td>
                  <td className={td}>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        l.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : l.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className={`${td} space-x-3`}>
                    {l.status === 'pending' && (
                      <>
                        <button
                          disabled={busyId === l.id}
                          onClick={() => decide(l, true)}
                          className="text-green-700 hover:underline text-sm"
                        >
                          Approve
                        </button>
                        <button
                          disabled={busyId === l.id}
                          onClick={() => decide(l, false)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Reject
                        </button>
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
  )
}
