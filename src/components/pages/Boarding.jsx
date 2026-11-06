import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Card, Scroll, Alert, PageTitle, input, btnGreen, th, td, toast } from '../ui'
import { BOARDING_ROLES, canEditData, isLeadership } from '../../lib/roles'

/**
 * Boarding (Pro) — aligned with Kenya MoE safety practice:
 * dorm capacity = beds, occupancy, assigned staff, laundry/drying notes, roll context.
 * Matron is a registered staff role (Setup → Staff) with boarding-only access.
 */
export default function Boarding({ school, user }) {
  const canEdit =
    BOARDING_ROLES.includes(user?.role) ||
    canEditData(user?.role) ||
    ['Principal', 'Deputy Principal', 'Senior Teacher', 'Secretary'].includes(user?.role)
  const headOnly = isLeadership(user?.role) || user?.role === 'Secretary'

  const [houses, setHouses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [students, setStudents] = useState([])
  const [staff, setStaff] = useState([])
  const [error, setError] = useState('')
  const [tab, setTab] = useState('houses') // houses | beds | staff | roll
  const [houseForm, setHouseForm] = useState({
    house_name: '',
    capacity: 40,
    bed_count: 40,
    drying_lines: 2,
    sex: 'Mixed',
    matron_user_id: '',
    notes: '',
  })
  const [asgForm, setAsgForm] = useState({ student_id: '', house_id: '', bed_label: '' })

  const load = useCallback(async () => {
    setError('')
    const [h, a, s, st] = await Promise.all([
      supabase.from('boarding_houses').select('*').eq('school_id', school?.id).order('house_name'),
      supabase
        .from('boarding_assignments')
        .select('*, students(admission_no, first_name, last_name), boarding_houses(house_name)')
        .eq('school_id', school?.id)
        .eq('active', true),
      supabase
        .from('students')
        .select('id, admission_no, first_name, last_name, gender')
        .eq('school_id', school?.id)
        .eq('status', 'Active')
        .order('first_name'),
      supabase
        .from('users')
        .select('id, full_name, role, status')
        .eq('school_id', school?.id)
        .in('role', ['Matron', 'Principal', 'Deputy Principal', 'Teacher', 'Secretary', 'Staff'])
        .order('full_name'),
    ])
    setHouses(h.data || [])
    setAssignments(a.data || [])
    setStudents(s.data || [])
    setStaff((st.data || []).filter((u) => u.status !== 'inactive'))
    if (h.error) setError(h.error.message)
  }, [school?.id])

  useEffect(() => {
    load()
  }, [load])

  const occByHouse = useMemo(() => {
    const m = {}
    assignments.forEach((a) => {
      const id = a.house_id
      if (!id) return
      m[id] = (m[id] || 0) + 1
    })
    return m
  }, [assignments])

  const totals = useMemo(() => {
    const beds = houses.reduce((s, h) => s + Number(h.bed_count ?? h.capacity ?? 0), 0)
    const cap = houses.reduce((s, h) => s + Number(h.capacity ?? 0), 0)
    const occ = assignments.length
    const lines = houses.reduce((s, h) => s + Number(h.drying_lines ?? 0), 0)
    return { beds, cap, occ, lines, freeBeds: Math.max(0, beds - occ) }
  }, [houses, assignments])

  const saveHouse = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    setError('')
    const beds = Number(houseForm.bed_count) || Number(houseForm.capacity) || 0
    const row = {
      school_id: school?.id,
      house_name: houseForm.house_name,
      capacity: Number(houseForm.capacity) || beds,
      bed_count: beds,
      drying_lines: Number(houseForm.drying_lines) || 0,
      sex: houseForm.sex || null,
      matron_name: staff.find((u) => u.id === houseForm.matron_user_id)?.full_name || null,
      matron_user_id: houseForm.matron_user_id || null,
      notes: houseForm.notes || null,
    }
    const { error: err } = await supabase.from('boarding_houses').insert([row])
    if (err) {
      // Fallback without new columns if migration not applied
      const { error: err2 } = await supabase.from('boarding_houses').insert([
        {
          school_id: school?.id,
          house_name: houseForm.house_name,
          capacity: row.capacity,
          matron_name: row.matron_name,
        },
      ])
      if (err2) return setError(err2.message + ' — run migrations/034_boarding_depth.sql')
      toast('House saved (basic columns). Run 034_boarding_depth.sql for beds/lines.', 'ok')
    } else {
      toast('Dormitory saved', 'ok')
    }
    setHouseForm({ house_name: '', capacity: 40, bed_count: 40, drying_lines: 2, sex: 'Mixed', matron_user_id: '', notes: '' })
    load()
  }

  const delHouse = async (id) => {
    if (!canEdit || !confirm('Delete this dormitory and its bed plan?')) return
    const { error: err } = await supabase.from('boarding_houses').delete().eq('id', id)
    if (err) return setError(err.message)
    load()
  }

  const saveAsg = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    setError('')
    const house = houses.find((h) => h.id === asgForm.house_id)
    const occ = occByHouse[asgForm.house_id] || 0
    const bedCap = Number(house?.bed_count ?? house?.capacity ?? 0)
    if (house && bedCap && occ >= bedCap) {
      return setError(`No free beds in ${house.house_name} (${occ}/${bedCap}). MoE: admission tied to bed capacity.`)
    }
    const { error: err } = await supabase.from('boarding_assignments').insert([
      {
        school_id: school?.id,
        student_id: asgForm.student_id,
        house_id: asgForm.house_id || null,
        bed_label: asgForm.bed_label || null,
        active: true,
      },
    ])
    if (err) return setError(err.message)
    setAsgForm({ student_id: '', house_id: '', bed_label: '' })
    load()
  }

  const endAsg = async (id) => {
    if (!canEdit || !confirm('End this boarding assignment?')) return
    const { error: err } = await supabase.from('boarding_assignments').update({ active: false }).eq('id', id)
    if (err) return setError(err.message)
    load()
  }

  const tabs = [
    { id: 'houses', label: 'Dormitories' },
    { id: 'beds', label: 'Bed register' },
    { id: 'staff', label: 'House staff' },
    { id: 'roll', label: 'Occupancy' },
  ]

  return (
    <div className="space-y-4">
      <PageTitle
        title="Boarding"
        subtitle="Dorms, beds, drying lines, assigned workers. Matron registers under Setup → Staff (role Matron)."
      />
      <Alert>{error}</Alert>
      {!canEdit && <Alert kind="ok">View only — Principal / Deputy / Secretary / Matron can edit.</Alert>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { l: 'Dorms', v: houses.length },
          { l: 'Beds', v: totals.beds },
          { l: 'Boarders', v: totals.occ },
          { l: 'Free beds', v: totals.freeBeds },
        ].map((x) => (
          <Card key={x.l}>
            <p className="text-[10px] font-black uppercase text-slate-500">{x.l}</p>
            <p className="text-2xl font-black text-slate-900">{x.v}</p>
          </Card>
        ))}
      </div>
      <p className="text-xs text-slate-600">
        Drying / laundry lines recorded: <strong>{totals.lines}</strong>. MoE practice: do not exceed bed capacity; keep daily roll.
      </p>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black border transition ${tab === t.id ? 'bg-amber-400 text-amber-950 border-amber-300 shadow' : 'bg-sky-600 text-white border-sky-500 hover:bg-sky-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'houses' && (
        <>
          {canEdit && (
            <Card title="Add dormitory / house">
              <form onSubmit={saveHouse} className="grid sm:grid-cols-2 gap-2">
                <input className={input} placeholder="House name (e.g. Nile)" value={houseForm.house_name} onChange={(e) => setHouseForm({ ...houseForm, house_name: e.target.value })} required />
                <select className={input} value={houseForm.sex} onChange={(e) => setHouseForm({ ...houseForm, sex: e.target.value })}>
                  <option>Boys</option>
                  <option>Girls</option>
                  <option>Mixed</option>
                </select>
                <input className={input} type="number" placeholder="Official capacity" value={houseForm.capacity} onChange={(e) => setHouseForm({ ...houseForm, capacity: e.target.value })} />
                <input className={input} type="number" placeholder="Bed count" value={houseForm.bed_count} onChange={(e) => setHouseForm({ ...houseForm, bed_count: e.target.value })} />
                <input className={input} type="number" placeholder="Drying / hanging lines" value={houseForm.drying_lines} onChange={(e) => setHouseForm({ ...houseForm, drying_lines: e.target.value })} />
                <select className={input} value={houseForm.matron_user_id} onChange={(e) => setHouseForm({ ...houseForm, matron_user_id: e.target.value })}>
                  <option value="">Assign matron / house staff…</option>
                  {staff.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role})
                    </option>
                  ))}
                </select>
                <input className={`${input} sm:col-span-2`} placeholder="Notes (exits, fire point…)" value={houseForm.notes} onChange={(e) => setHouseForm({ ...houseForm, notes: e.target.value })} />
                <button className={btnGreen}>Save dormitory</button>
              </form>
            </Card>
          )}
          <Card className="!p-0">
            <Scroll>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={th}>House</th>
                    <th className={th}>Sex</th>
                    <th className={th}>Beds</th>
                    <th className={th}>Occupied</th>
                    <th className={th}>Lines</th>
                    <th className={th}>Staff</th>
                    {canEdit && <th className={th}></th>}
                  </tr>
                </thead>
                <tbody>
                  {houses.map((h) => {
                    const occ = occByHouse[h.id] || 0
                    const beds = Number(h.bed_count ?? h.capacity ?? 0)
                    return (
                      <tr key={h.id}>
                        <td className={td}>{h.house_name}</td>
                        <td className={td}>{h.sex || '—'}</td>
                        <td className={td}>{beds}</td>
                        <td className={td}>
                          <span className={occ > beds ? 'text-red-700 font-black' : 'font-bold'}>
                            {occ}/{beds || '—'}
                          </span>
                        </td>
                        <td className={td}>{h.drying_lines ?? '—'}</td>
                        <td className={td}>{h.matron_name || '—'}</td>
                        {canEdit && (
                          <td className={td}>
                            <button type="button" className="text-red-600 text-xs font-bold" onClick={() => delHouse(h.id)}>
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Scroll>
          </Card>
        </>
      )}

      {tab === 'beds' && (
        <>
          {canEdit && (
            <Card title="Assign learner to bed">
              <form onSubmit={saveAsg} className="grid sm:grid-cols-2 gap-2">
                <select className={input} value={asgForm.student_id} onChange={(e) => setAsgForm({ ...asgForm, student_id: e.target.value })} required>
                  <option value="">Student…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.admission_no} — {s.first_name} {s.last_name}
                    </option>
                  ))}
                </select>
                <select className={input} value={asgForm.house_id} onChange={(e) => setAsgForm({ ...asgForm, house_id: e.target.value })} required>
                  <option value="">House…</option>
                  {houses.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.house_name}
                    </option>
                  ))}
                </select>
                <input className={input} placeholder="Bed label (e.g. A-12)" value={asgForm.bed_label} onChange={(e) => setAsgForm({ ...asgForm, bed_label: e.target.value })} />
                <button className={btnGreen}>Assign bed</button>
              </form>
            </Card>
          )}
          <Card className="!p-0">
            <Scroll>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={th}>Learner</th>
                    <th className={th}>House</th>
                    <th className={th}>Bed</th>
                    {canEdit && <th className={th}></th>}
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id}>
                      <td className={td}>
                        {a.students?.admission_no} — {a.students?.first_name} {a.students?.last_name}
                      </td>
                      <td className={td}>{a.boarding_houses?.house_name || '—'}</td>
                      <td className={td}>{a.bed_label || '—'}</td>
                      {canEdit && (
                        <td className={td}>
                          <button type="button" className="text-red-600 text-xs font-bold" onClick={() => endAsg(a.id)}>
                            End
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Scroll>
          </Card>
        </>
      )}

      {tab === 'staff' && (
        <Card title="Workers who can be assigned to dorms">
          <p className="text-sm text-slate-600 mb-3">
            Register matrons under <strong>Setup → Staff</strong> (join with school code → approve → role <strong>Matron</strong>).
            Only heads see full staff list; Matron sees boarding tools only.
          </p>
          {!headOnly && user?.role === 'Matron' ? (
            <p className="text-sm">You are signed in as Matron. Manage houses and beds above.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {staff
                .filter((u) => u.role === 'Matron' || u.role === 'Staff')
                .map((u) => (
                  <li key={u.id} className="flex justify-between border-b border-slate-100 py-1">
                    <span className="font-semibold">{u.full_name}</span>
                    <span className="text-slate-500">{u.role}</span>
                  </li>
                ))}
              {staff.filter((u) => u.role === 'Matron').length === 0 && (
                <li className="text-slate-500">No Matron role users yet.</li>
              )}
            </ul>
          )}
        </Card>
      )}

      {tab === 'roll' && (
        <Card title="Occupancy snapshot">
          <p className="text-sm text-slate-600 mb-2">Use Attendance module for daily class roll; here is boarding bed occupancy by house.</p>
          <ul className="space-y-2">
            {houses.map((h) => {
              const occ = occByHouse[h.id] || 0
              const beds = Number(h.bed_count ?? h.capacity ?? 1) || 1
              const pct = Math.min(100, Math.round((occ / beds) * 100))
              return (
                <div key={h.id}>
                  <div className="flex justify-between text-xs font-bold mb-0.5">
                    <span>{h.house_name}</span>
                    <span>
                      {occ}/{beds} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded bg-slate-100 overflow-hidden">
                    <div className={`h-full ${pct >= 100 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
