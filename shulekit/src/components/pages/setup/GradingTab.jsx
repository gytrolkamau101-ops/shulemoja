import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../supabaseClient'
import { Card, Scroll, Alert, input, btn, btnGreen, btnGhost, th, td, fmt } from '../../ui'
import { logAudit } from '../../../lib/audit'

export default function GradingTab({ school }) {
  const [scales, setScales] = useState([])
  const [bands, setBands] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [label, setLabel] = useState('')
  const [minPct, setMinPct] = useState('')
  const [maxPct, setMaxPct] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: sc } = await supabase
      .from('grade_scales')
      .select('*')
      .eq('school_id', school?.id)
      .order('scale_name')
    setScales(sc || [])
    const active = (sc || []).find((s) => s.is_active) || (sc || [])[0]
    setActiveId(active?.id || null)
    if (active) {
      const { data: b } = await supabase
        .from('grade_bands')
        .select('*')
        .eq('scale_id', active.id)
        .order('sort_order')
      setBands(b || [])
    } else setBands([])
    setLoading(false)
  }, [school?.id])

  useEffect(() => {
    load()
  }, [load])

  const seed = async (kind) => {
    setError('')
    const fn = kind === 'cbc' ? 'seed_cbc_scale' : 'seed_classic_scale'
    const { error } = await supabase.rpc(fn, { p_school_id: school?.id })
    if (error) return setError(error.message)
    await logAudit('grade_scale.seed', 'grade_scales', null, { kind })
    load()
  }

  const setActive = async (id) => {
    setError('')
    await supabase.from('grade_scales').update({ is_active: false }).eq('school_id', school?.id)
    const { error } = await supabase.from('grade_scales').update({ is_active: true }).eq('id', id)
    if (error) return setError(error.message)
    await logAudit('grade_scale.activate', 'grade_scales', id)
    load()
  }

  const addBand = async (e) => {
    e.preventDefault()
    if (!activeId) return setError('Create or activate a scale first.')
    setError('')
    const { error } = await supabase.from('grade_bands').insert([
      {
        school_id: school?.id,
        scale_id: activeId,
        label: label.trim().toUpperCase(),
        min_pct: Number(minPct),
        max_pct: Number(maxPct),
        sort_order: bands.length + 1,
      },
    ])
    if (error) return setError(error.message)
    setLabel('')
    setMinPct('')
    setMaxPct('')
    load()
  }

  const removeBand = async (id) => {
    await supabase.from('grade_bands').delete().eq('id', id)
    load()
  }

  return (
    <div className="space-y-6">
      <Card title="Grading system">
        <p className="text-sm text-gray-600 mb-3">
          CBC schools often use BE / AE / ME / EE. Secondary schools may use A–E. Seed a preset, then
          adjust bands. Exam marks use the <strong>active</strong> scale.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => seed('cbc')} className={btnGreen}>
            Seed CBC (BE–EE)
          </button>
          <button type="button" onClick={() => seed('classic')} className={btn}>
            Seed Classic A–E
          </button>
        </div>
        <Alert>{error}</Alert>
      </Card>

      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : (
        <>
          <Card title="Scales">
            {scales.length === 0 ? (
              <p className="text-sm text-gray-500">No scales yet — seed CBC or Classic above.</p>
            ) : (
              <ul className="divide-y">
                {scales.map((s) => (
                  <li key={s.id} className="py-2 flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-800">
                      {s.scale_name}{' '}
                      {s.is_active && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Active</span>
                      )}
                    </span>
                    {!s.is_active && (
                      <button onClick={() => setActive(s.id)} className="text-blue-600 text-sm hover:underline">
                        Make active
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Bands on active scale">
            <form onSubmit={addBand} className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <input className={input} placeholder="Label (e.g. ME)" value={label} onChange={(e) => setLabel(e.target.value)} required />
              <input type="number" step="0.01" className={input} placeholder="Min %" value={minPct} onChange={(e) => setMinPct(e.target.value)} required />
              <input type="number" step="0.01" className={input} placeholder="Max %" value={maxPct} onChange={(e) => setMaxPct(e.target.value)} required />
              <button className={btnGreen}>Add band</button>
            </form>
            <Scroll>
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className={th}>Label</th>
                    <th className={th}>Min %</th>
                    <th className={th}>Max %</th>
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {bands.map((b) => (
                    <tr key={b.id} className="border-b">
                      <td className={td}>{b.label}</td>
                      <td className={td}>{b.min_pct}</td>
                      <td className={td}>{b.max_pct}</td>
                      <td className={td}>
                        <button onClick={() => removeBand(b.id)} className="text-red-600 text-sm hover:underline">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Scroll>
          </Card>
        </>
      )}
    </div>
  )
}
