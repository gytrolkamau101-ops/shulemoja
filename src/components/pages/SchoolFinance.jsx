import { canDetailedSchoolFinance } from '../../lib/plans'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Card, Scroll, Alert, PageTitle, input, btnGreen, th, td, fmt, toast } from '../ui'
import { canEditFinance, isLeadership } from '../../lib/roles'

/** Vote heads aligned to MoE-style primary operations (editable labels). */
const VOTE_HEADS = [
  'Textbooks / learning materials',
  'Exercise books & stationery',
  'Support staff wages',
  'RMI / infrastructure',
  'Activity / co-curricular',
  'Local transport',
  'Electricity / water',
  'Environment & sanitation',
  'BOM / capacity building',
  'Assessments & exams',
  'Meals / feeding',
  'Other',
]

const SOURCE_TYPES = [
  { id: 'capitation', label: 'Capitation (govt)' },
  { id: 'pta', label: 'PTA / parents project' },
  { id: 'donor', label: 'Donor / NGO' },
  { id: 'cdf', label: 'NG-CDF / County' },
  { id: 'other_income', label: 'Other school income' },
  { id: 'in_kind', label: 'In-kind (food/goods)' },
  { id: 'expense', label: 'General expense' },
]

const TAB_CLS = (on, gold = false) =>
  `px-3 py-1.5 rounded-xl text-xs font-black border shrink-0 transition ${
    on
      ? gold
        ? 'bg-gradient-to-b from-amber-300 to-amber-600 text-amber-950 border-amber-200 shadow-[0_3px_0_#b45309,0_0_16px_rgba(251,191,36,0.5)]'
        : 'bg-gradient-to-b from-sky-400 to-blue-700 text-white border-sky-300 shadow-[0_3px_0_#1e3a8a,0_0_16px_rgba(56,189,248,0.5)]'
      : gold
        ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
        : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100'
  }`

function money(n) {
  return `KES ${fmt(Number(n) || 0)}`
}

/**
 * School finance hub — tracking only (no platform money).
 * Tabs: Overview | Capitation | Other funds | Projects | In-kind | Expenses
 */
export default function SchoolFinance({ school, term, user }) {
  const canEdit = canEditFinance(user?.role) || isLeadership(user?.role)
  const detailed = canDetailedSchoolFinance(school)
  const [tab, setTab] = useState('overview')
  const [funds, setFunds] = useState([])
  const [projects, setProjects] = useState([])
  const [expenses, setExpenses] = useState([])
  const [capRows, setCapRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (!detailed && ['funds', 'projects', 'inkind'].includes(tab)) setTab('overview')
  }, [detailed, tab])

  // Shared form state
  const [direction, setDirection] = useState('in')
  const [sourceType, setSourceType] = useState('pta')
  const [category, setCategory] = useState(VOTE_HEADS[0])
  const [amount, setAmount] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [projectId, setProjectId] = useState('')
  const [inKindItem, setInKindItem] = useState('')
  const [inKindQty, setInKindQty] = useState('')
  const [inKindUnit, setInKindUnit] = useState('bags')
  const [estValue, setEstValue] = useState('')

  // Project form
  const [projName, setProjName] = useState('')
  const [projBudget, setProjBudget] = useState('')
  const [projStatus, setProjStatus] = useState('planned')
  const [projDesc, setProjDesc] = useState('')

  // Legacy expenses form
  const [expType, setExpType] = useState('Maintenance')
  const [expAmount, setExpAmount] = useState('')
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10))
  const [expNotes, setExpNotes] = useState('')

  const load = useCallback(async () => {
    if (!school?.id) return
    setLoading(true)
    setError('')
    try {
    const tasks = [
      supabase.from('school_fund_entries').select('*').eq('school_id', school.id).order('entry_date', { ascending: false }).limit(400),
      supabase.from('school_projects').select('*').eq('school_id', school.id).order('created_at', { ascending: false }),
      supabase.from('capitation_entries').select('*').eq('school_id', school.id).order('entry_date', { ascending: false }).limit(300),
    ]
    if (term?.id) {
      tasks.push(
        supabase.from('expenses').select('*').eq('school_id', school.id).eq('term_id', term.id).order('expense_date', { ascending: false })
      )
    }
    const results = await Promise.all(tasks)
    const fundErr = results[0].error
    if (fundErr?.message?.includes('does not exist')) {
      setInfo('Run migrations/036_school_funds_projects.sql in Supabase for full funds & projects.')
      setFunds([])
    } else if (fundErr) {
      setError(fundErr.message)
      setFunds([])
    } else setFunds(results[0].data || [])

    if (results[1].error?.message?.includes('does not exist')) setProjects([])
    else setProjects(results[1].data || [])

    if (results[2].error?.message?.includes('does not exist')) {
      setCapRows([])
    } else setCapRows(results[2].data || [])

    if (term?.id) setExpenses(results[3]?.data || [])
    else setExpenses([])
    } catch (e) {
      setError(e?.message || 'Failed to load school finance')
      setFunds([])
      setProjects([])
      setCapRows([])
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }, [school?.id, term?.id])

  useEffect(() => {
    load()
  }, [load])

  const capIn = useMemo(() => capRows.filter((r) => r.kind === 'inflow').reduce((s, r) => s + Number(r.amount), 0), [capRows])
  const capOut = useMemo(() => capRows.filter((r) => r.kind === 'spend').reduce((s, r) => s + Number(r.amount), 0), [capRows])
  const capBal = capIn - capOut

  const fundIn = useMemo(
    () => funds.filter((r) => r.direction === 'in').reduce((s, r) => s + Number(r.amount || r.estimated_value || 0), 0),
    [funds]
  )
  const fundOut = useMemo(() => funds.filter((r) => r.direction === 'out').reduce((s, r) => s + Number(r.amount), 0), [funds])
  const expTotal = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses])

  const bySource = useMemo(() => {
    const m = {}
    funds.forEach((r) => {
      const k = r.source_type || 'other'
      if (!m[k]) m[k] = { in: 0, out: 0 }
      const v = Number(r.amount || r.estimated_value || 0)
      if (r.direction === 'in') m[k].in += v
      else m[k].out += v
    })
    return m
  }, [funds])

  const projectStats = useMemo(() => {
    return projects.map((p) => {
      const related = funds.filter((f) => f.project_id === p.id)
      const raised = related.filter((f) => f.direction === 'in').reduce((s, f) => s + Number(f.amount || f.estimated_value || 0), 0)
      const spent = related.filter((f) => f.direction === 'out').reduce((s, f) => s + Number(f.amount), 0)
      return { ...p, raised, spent, remaining: Number(p.budget || 0) - spent }
    })
  }, [projects, funds])

  const saveFund = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    setError('')
    const isInKind = sourceType === 'in_kind'
    const n = Number(amount) || 0
    const ev = Number(estValue) || 0
    if (!isInKind && n <= 0) return setError('Enter a positive amount')
    if (isInKind && !inKindItem.trim()) return setError('Describe the in-kind item')
    const row = {
      school_id: school.id,
      term_id: term?.id || null,
      project_id: projectId || null,
      direction: isInKind ? 'in' : direction,
      source_type: sourceType,
      category: category || null,
      amount: isInKind ? 0 : n,
      in_kind_item: isInKind ? inKindItem.trim() : null,
      in_kind_qty: isInKind ? Number(inKindQty) || null : null,
      in_kind_unit: isInKind ? inKindUnit : null,
      estimated_value: isInKind ? ev : null,
      entry_date: entryDate,
      reference: reference || null,
      notes: notes || null,
      created_by: user?.id,
    }
    const { error } = await supabase.from('school_fund_entries').insert([row])
    if (error) setError(error.message.includes('does not exist') ? 'Run migrations/036_school_funds_projects.sql' : error.message)
    else {
      toast('Saved', 'ok')
      setAmount('')
      setNotes('')
      setReference('')
      setInKindItem('')
      setInKindQty('')
      setEstValue('')
      load()
    }
  }

  const saveCap = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    setError('')
    const n = Number(amount)
    if (!n || n <= 0) return setError('Enter a positive amount')
    const kind = direction === 'in' ? 'inflow' : 'spend'
    const { error } = await supabase.from('capitation_entries').insert([
      {
        school_id: school.id,
        term_id: term?.id || null,
        kind,
        amount: n,
        source: kind === 'inflow' ? 'MoE / Capitation' : category,
        vote_head: kind === 'spend' ? category : null,
        notes: notes || null,
        entry_date: entryDate,
        created_by: user?.id,
      },
    ])
    if (error) setError(error.message.includes('does not exist') ? 'Run migrations/032_capitation.sql' : error.message)
    else {
      toast('Capitation saved', 'ok')
      setAmount('')
      setNotes('')
      load()
    }
  }

  const saveProject = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    if (!projName.trim()) return setError('Project name required')
    const { error } = await supabase.from('school_projects').insert([
      {
        school_id: school.id,
        name: projName.trim(),
        budget: Number(projBudget) || 0,
        status: projStatus,
        description: projDesc || null,
      },
    ])
    if (error) setError(error.message.includes('does not exist') ? 'Run migrations/036_school_funds_projects.sql' : error.message)
    else {
      toast('Project created', 'ok')
      setProjName('')
      setProjBudget('')
      setProjDesc('')
      load()
    }
  }

  const saveExpense = async (e) => {
    e.preventDefault()
    if (!canEdit || !term) return
    const n = Number(expAmount)
    if (!n || n <= 0) return setError('Enter amount')
    const { error } = await supabase.from('expenses').insert([
      {
        school_id: school.id,
        term_id: term.id,
        expense_type: expType,
        amount: n,
        expense_date: expDate,
        notes: expNotes || null,
      },
    ])
    if (error) setError(error.message)
    else {
      toast('Expense saved', 'ok')
      setExpAmount('')
      setExpNotes('')
      load()
    }
  }

  const delFund = async (id) => {
    if (!canEdit || !confirm('Delete entry?')) return
    await supabase.from('school_fund_entries').delete().eq('id', id)
    load()
  }
  const delCap = async (id) => {
    if (!canEdit || !confirm('Delete entry?')) return
    await supabase.from('capitation_entries').delete().eq('id', id)
    load()
  }
  const delProject = async (id) => {
    if (!canEdit || !confirm('Delete project? Linked fund lines keep data but unlink.')) return
    await supabase.from('school_projects').delete().eq('id', id)
    load()
  }
  const delExpense = async (id) => {
    if (!canEdit || !confirm('Delete expense?')) return
    await supabase.from('expenses').delete().eq('id', id)
    load()
  }

  const exportCsv = (rows, filename) => {
    if (!rows?.length) return toast('Nothing to export', 'info')
    const keys = Object.keys(rows[0])
    const lines = [keys.join(',')]
    rows.forEach((r) => {
      lines.push(keys.map((k) => JSON.stringify(r[k] ?? '')).join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
  }

  const exportTermSummary = () => {
    const lines = [
      ['section', 'metric', 'amount'],
      ['capitation', 'inflow', capIn],
      ['capitation', 'spend', capOut],
      ['capitation', 'balance', capBal],
      ['funds', 'in', fundIn],
      ['funds', 'out', fundOut],
      ['expenses', 'total', expTotal],
    ]
    Object.entries(bySource).forEach(([k, v]) => {
      lines.push([`source:${k}`, 'in', v.in])
      lines.push([`source:${k}`, 'out', v.out])
    })
    projectStats.forEach((p) => {
      lines.push([`project:${p.name}`, 'budget', p.budget])
      lines.push([`project:${p.name}`, 'raised', p.raised])
      lines.push([`project:${p.name}`, 'spent', p.spent])
    })
    const csv = lines.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `school_finance_summary_${school?.school_code || 'school'}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      <PageTitle
        right={
          <button type="button" className="px-3 py-1.5 rounded-lg text-xs font-black bg-sky-600 text-white" onClick={exportTermSummary}>
            Export term CSV
          </button>
        }
      >
        School finance
      </PageTitle>
      <p className="text-xs text-slate-500 -mt-2">
        Tracking only — school bank / Paybill stay with the school. Public: capitation + vote heads. All schools: PTA, donors, projects, in-kind.
      </p>

      {error && <Alert kind="error">{error}</Alert>}
      {info && <Alert kind="ok">{info}</Alert>}

      <div className="flex flex-wrap gap-1.5">
        {(detailed
          ? [
              ['overview', 'Overview'],
              ['capitation', 'Capitation'],
              ['funds', 'Other funds'],
              ['projects', 'Projects'],
              ['inkind', 'In-kind'],
              ['expenses', 'Expenses'],
            ]
          : [
              ['overview', 'Overview'],
              ['capitation', 'Capitation'],
              ['expenses', 'Expenses'],
            ]
        ).map(([id, label]) => (
          <button key={id} type="button" className={TAB_CLS(tab === id, detailed)} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {!detailed && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Basic: overview, capitation & expenses. Projects, other funds & in-kind detail unlock on <strong>Premium / Pro</strong>.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Card className="p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Capitation balance</p>
                  <p className="text-lg font-black text-slate-900">{money(capBal)}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Other funds in</p>
                  <p className="text-lg font-black text-emerald-700">{money(fundIn)}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Funds out</p>
                  <p className="text-lg font-black text-rose-700">{money(fundOut)}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Open projects</p>
                  <p className="text-lg font-black text-sky-800">{projects.filter((p) => p.status !== 'complete').length}</p>
                </Card>
              </div>
              <Card className="p-3">
                <p className="text-xs font-black text-slate-700 mb-2">Money in by source</p>
                <Scroll>
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className={th}>Source</th>
                        <th className={th}>In</th>
                        <th className={th}>Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className={td}>Capitation</td>
                        <td className={td}>{money(capIn)}</td>
                        <td className={td}>{money(capOut)}</td>
                      </tr>
                      {Object.entries(bySource).map(([k, v]) => (
                        <tr key={k}>
                          <td className={td}>{k}</td>
                          <td className={td}>{money(v.in)}</td>
                          <td className={td}>{money(v.out)}</td>
                        </tr>
                      ))}
                      {!Object.keys(bySource).length && (
                        <tr>
                          <td className={td} colSpan={3}>
                            No other fund entries yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Scroll>
              </Card>
              {projectStats.length > 0 && (
                <Card className="p-3">
                  <p className="text-xs font-black text-slate-700 mb-2">Projects</p>
                  <Scroll>
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className={th}>Name</th>
                          <th className={th}>Budget</th>
                          <th className={th}>Raised</th>
                          <th className={th}>Spent</th>
                          <th className={th}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectStats.map((p) => (
                          <tr key={p.id}>
                            <td className={td}>{p.name}</td>
                            <td className={td}>{money(p.budget)}</td>
                            <td className={td}>{money(p.raised)}</td>
                            <td className={td}>{money(p.spent)}</td>
                            <td className={td}>{p.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Scroll>
                </Card>
              )}
            </div>
          )}

          {tab === 'capitation' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Card className="p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">In</p>
                  <p className="font-black text-emerald-700">{money(capIn)}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Spend</p>
                  <p className="font-black text-rose-700">{money(capOut)}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Balance</p>
                  <p className="font-black">{money(capBal)}</p>
                </Card>
              </div>
              {canEdit && (
                <Card className="p-3">
                  <form onSubmit={saveCap} className="grid sm:grid-cols-2 gap-2">
                    <select className={input} value={direction} onChange={(e) => setDirection(e.target.value)}>
                      <option value="in">Inflow (received)</option>
                      <option value="out">Spend (vote head)</option>
                    </select>
                    {direction === 'out' && (
                      <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
                        {VOTE_HEADS.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    )}
                    <input className={input} type="number" min="0" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                    <input className={input} type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                    <input className={`${input} sm:col-span-2`} placeholder="Notes / circular ref" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    <button type="submit" className={btnGreen}>
                      Save capitation
                    </button>
                  </form>
                </Card>
              )}
              <Card className="p-0 overflow-hidden">
                <Scroll>
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className={th}>Date</th>
                        <th className={th}>Kind</th>
                        <th className={th}>Source / vote head</th>
                        <th className={th}>Amount</th>
                        <th className={th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {capRows.map((r) => (
                        <tr key={r.id}>
                          <td className={td}>{r.entry_date}</td>
                          <td className={td}>{r.kind}</td>
                          <td className={td}>{r.vote_head || r.source || '—'}</td>
                          <td className={td}>{money(r.amount)}</td>
                          <td className={td}>
                            {canEdit && (
                              <button type="button" className="text-rose-600 text-xs font-bold" onClick={() => delCap(r.id)}>
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {!capRows.length && (
                        <tr>
                          <td className={td} colSpan={5}>
                            No capitation entries
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Scroll>
                <div className="p-2 border-t">
                  <button type="button" className="text-xs font-bold text-sky-700" onClick={() => exportCsv(capRows, 'capitation.csv')}>
                    Export CSV
                  </button>
                </div>
              </Card>
            </div>
          )}

          {(tab === 'funds' || tab === 'inkind') && (
            <div className="space-y-3">
              {canEdit && (
                <Card className="p-3">
                  <form onSubmit={saveFund} className="grid sm:grid-cols-2 gap-2">
                    <select
                      className={input}
                      value={sourceType}
                      onChange={(e) => {
                        setSourceType(e.target.value)
                        if (e.target.value === 'in_kind') setDirection('in')
                      }}
                    >
                      {SOURCE_TYPES.filter((s) => (tab === 'inkind' ? s.id === 'in_kind' : s.id !== 'in_kind')).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                      {tab === 'inkind' && <option value="in_kind">In-kind (food/goods)</option>}
                    </select>
                    {sourceType !== 'in_kind' && (
                      <select className={input} value={direction} onChange={(e) => setDirection(e.target.value)}>
                        <option value="in">Money in</option>
                        <option value="out">Money out</option>
                      </select>
                    )}
                    {sourceType === 'in_kind' ? (
                      <>
                        <input className={input} placeholder="Item (e.g. maize)" value={inKindItem} onChange={(e) => setInKindItem(e.target.value)} required />
                        <div className="flex gap-2">
                          <input className={input} type="number" placeholder="Qty" value={inKindQty} onChange={(e) => setInKindQty(e.target.value)} />
                          <input className={input} placeholder="Unit" value={inKindUnit} onChange={(e) => setInKindUnit(e.target.value)} />
                        </div>
                        <input className={input} type="number" placeholder="Est. value KES" value={estValue} onChange={(e) => setEstValue(e.target.value)} />
                      </>
                    ) : (
                      <>
                        <input className={input} type="number" min="0" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                        <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
                          {VOTE_HEADS.map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </>
                    )}
                    <select className={input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                      <option value="">No project link</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input className={input} type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                    <input className={input} placeholder="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
                    <input className={`${input} sm:col-span-2`} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    <button type="submit" className={btnGreen}>
                      Save entry
                    </button>
                  </form>
                </Card>
              )}
              <Card className="p-0 overflow-hidden">
                <Scroll>
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className={th}>Date</th>
                        <th className={th}>Source</th>
                        <th className={th}>Dir</th>
                        <th className={th}>Detail</th>
                        <th className={th}>Amount / value</th>
                        <th className={th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {funds
                        .filter((r) => (tab === 'inkind' ? r.source_type === 'in_kind' : r.source_type !== 'in_kind'))
                        .map((r) => (
                          <tr key={r.id}>
                            <td className={td}>{r.entry_date}</td>
                            <td className={td}>{r.source_type}</td>
                            <td className={td}>{r.direction}</td>
                            <td className={td}>
                              {r.source_type === 'in_kind'
                                ? `${r.in_kind_item || ''} ${r.in_kind_qty || ''} ${r.in_kind_unit || ''}`
                                : r.category || r.notes || '—'}
                            </td>
                            <td className={td}>{money(r.amount || r.estimated_value)}</td>
                            <td className={td}>
                              {canEdit && (
                                <button type="button" className="text-rose-600 text-xs font-bold" onClick={() => delFund(r.id)}>
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </Scroll>
              </Card>
            </div>
          )}

          {tab === 'projects' && (
            <div className="space-y-3">
              {canEdit && (
                <Card className="p-3">
                  <form onSubmit={saveProject} className="grid sm:grid-cols-2 gap-2">
                    <input className={input} placeholder="Project name (e.g. Toilet block)" value={projName} onChange={(e) => setProjName(e.target.value)} required />
                    <input className={input} type="number" placeholder="Budget KES" value={projBudget} onChange={(e) => setProjBudget(e.target.value)} />
                    <select className={input} value={projStatus} onChange={(e) => setProjStatus(e.target.value)}>
                      <option value="planned">Planned</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="complete">Complete</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <input className={input} placeholder="Description" value={projDesc} onChange={(e) => setProjDesc(e.target.value)} />
                    <button type="submit" className={btnGreen}>
                      Add project
                    </button>
                  </form>
                </Card>
              )}
              <Card className="p-0 overflow-hidden">
                <Scroll>
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className={th}>Name</th>
                        <th className={th}>Budget</th>
                        <th className={th}>Raised</th>
                        <th className={th}>Spent</th>
                        <th className={th}>Status</th>
                        <th className={th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectStats.map((p) => (
                        <tr key={p.id}>
                          <td className={td}>
                            <div className="font-semibold">{p.name}</div>
                            {p.description && <div className="text-[10px] text-slate-500">{p.description}</div>}
                          </td>
                          <td className={td}>{money(p.budget)}</td>
                          <td className={td}>{money(p.raised)}</td>
                          <td className={td}>{money(p.spent)}</td>
                          <td className={td}>{p.status}</td>
                          <td className={td}>
                            {canEdit && (
                              <button type="button" className="text-rose-600 text-xs font-bold" onClick={() => delProject(p.id)}>
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {!projectStats.length && (
                        <tr>
                          <td className={td} colSpan={6}>
                            No projects — e.g. toilets, water tank, kitchen
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Scroll>
              </Card>
            </div>
          )}

          {tab === 'expenses' && (
            <div className="space-y-3">
              {!term && <Alert>Select a current term in Setup to log term expenses.</Alert>}
              {canEdit && term && (
                <Card className="p-3">
                  <form onSubmit={saveExpense} className="grid sm:grid-cols-2 gap-2">
                    <select className={input} value={expType} onChange={(e) => setExpType(e.target.value)}>
                      {['Electricity', 'Water', 'Staff Salary', 'Maintenance', 'Office Supplies', 'Transport', 'Other'].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <input className={input} type="number" placeholder="Amount" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required />
                    <input className={input} type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
                    <input className={input} placeholder="Notes" value={expNotes} onChange={(e) => setExpNotes(e.target.value)} />
                    <button type="submit" className={btnGreen}>
                      Save expense
                    </button>
                  </form>
                </Card>
              )}
              <Card className="p-0 overflow-hidden">
                <p className="px-3 py-2 text-xs font-bold text-slate-600 border-b">Term expenses: {money(expTotal)}</p>
                <Scroll>
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className={th}>Date</th>
                        <th className={th}>Type</th>
                        <th className={th}>Amount</th>
                        <th className={th}>Notes</th>
                        <th className={th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e) => (
                        <tr key={e.id}>
                          <td className={td}>{e.expense_date}</td>
                          <td className={td}>{e.expense_type}</td>
                          <td className={td}>{money(e.amount)}</td>
                          <td className={td}>{e.notes || '—'}</td>
                          <td className={td}>
                            {canEdit && (
                              <button type="button" className="text-rose-600 text-xs font-bold" onClick={() => delExpense(e.id)}>
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Scroll>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
