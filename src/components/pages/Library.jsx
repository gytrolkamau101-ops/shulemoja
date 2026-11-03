import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Card, Scroll, Alert, PageTitle, input, btnGreen, th, td, toast } from '../ui'
import { isLeadership } from '../../lib/roles'

/** School library inventory — catalogue + status (simplified library practice) */
const CATEGORIES = [
  'Textbook',
  'Fiction',
  'Non-fiction',
  'Reference',
  'Story collection',
  'Professional',
  'Other',
]
const STATUSES = ['Available', 'Issued', 'Lost', 'Damaged', 'Weeded']

export default function Library({ school, user }) {
  const canEdit =
    isLeadership(user?.role) ||
    user?.role === 'Secretary' ||
    user?.role === 'Librarian' ||
    user?.role === 'Teacher'
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [form, setForm] = useState({
    title: '',
    author: '',
    category: 'Textbook',
    accession_no: '',
    isbn: '',
    copies: 1,
    status: 'Available',
    shelf: '',
  })

  const load = useCallback(async () => {
    setError('')
    const { data, error } = await supabase
      .from('library_items')
      .select('*')
      .eq('school_id', school?.id)
      .order('title')
      .limit(500)
    if (error) {
      setError(
        error.message.includes('does not exist')
          ? 'Run migrations/035_library.sql in Supabase to enable the library.'
          : error.message
      )
      setRows([])
    } else setRows(data || [])
  }, [school?.id])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    let list = rows
    if (filter !== 'all') list = list.filter((r) => r.category === filter)
    if (q.trim()) {
      const s = q.toLowerCase()
      list = list.filter(
        (r) =>
          (r.title || '').toLowerCase().includes(s) ||
          (r.author || '').toLowerCase().includes(s) ||
          (r.accession_no || '').toLowerCase().includes(s) ||
          (r.isbn || '').toLowerCase().includes(s)
      )
    }
    return list
  }, [rows, filter, q])

  const byCat = useMemo(() => {
    const m = {}
    rows.forEach((r) => {
      const c = r.category || 'Other'
      m[c] = (m[c] || 0) + Number(r.copies || 1)
    })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [rows])

  const save = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    setError('')
    const { error } = await supabase.from('library_items').insert([
      {
        school_id: school.id,
        title: form.title,
        author: form.author || null,
        category: form.category,
        accession_no: form.accession_no || null,
        isbn: form.isbn || null,
        copies: Number(form.copies) || 1,
        status: form.status,
        shelf: form.shelf || null,
        created_by: user?.id,
      },
    ])
    if (error) setError(error.message)
    else {
      toast('Book added', 'ok')
      setForm({ title: '', author: '', category: 'Textbook', accession_no: '', isbn: '', copies: 1, status: 'Available', shelf: '' })
      load()
    }
  }

  const setStatus = async (id, status) => {
    if (!canEdit) return
    const { error } = await supabase.from('library_items').update({ status }).eq('id', id)
    if (error) setError(error.message)
    else load()
  }

  const remove = async (id) => {
    if (!canEdit || !confirm('Remove this title from the catalogue?')) return
    const { error } = await supabase.from('library_items').delete().eq('id', id)
    if (error) setError(error.message)
    else load()
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Library" subtitle="Catalogue by category · accession · status" />
      <Alert>{error}</Alert>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card>
          <p className="text-[10px] font-black uppercase text-slate-500">Titles</p>
          <p className="text-2xl font-black">{rows.length}</p>
        </Card>
        <Card>
          <p className="text-[10px] font-black uppercase text-slate-500">Copies</p>
          <p className="text-2xl font-black">{rows.reduce((s, r) => s + Number(r.copies || 1), 0)}</p>
        </Card>
        <Card>
          <p className="text-[10px] font-black uppercase text-slate-500">Available</p>
          <p className="text-2xl font-black text-emerald-700">{rows.filter((r) => r.status === 'Available').length}</p>
        </Card>
        <Card>
          <p className="text-[10px] font-black uppercase text-slate-500">Issued</p>
          <p className="text-2xl font-black text-amber-700">{rows.filter((r) => r.status === 'Issued').length}</p>
        </Card>
      </div>
      {byCat.length > 0 && (
        <Card title="By category">
          <ul className="flex flex-wrap gap-2 text-xs font-bold">
            {byCat.map(([c, n]) => (
              <li key={c} className="px-2 py-1 rounded-lg bg-slate-100">
                {c}: {n}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {canEdit && (
        <Card title="Add title">
          <form onSubmit={save} className="grid sm:grid-cols-2 gap-2">
            <input className={input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <input className={input} placeholder="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input className={input} placeholder="Accession no." value={form.accession_no} onChange={(e) => setForm({ ...form, accession_no: e.target.value })} />
            <input className={input} placeholder="ISBN" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
            <input className={input} type="number" min={1} placeholder="Copies" value={form.copies} onChange={(e) => setForm({ ...form, copies: e.target.value })} />
            <input className={input} placeholder="Shelf / location" value={form.shelf} onChange={(e) => setForm({ ...form, shelf: e.target.value })} />
            <button className={btnGreen}>Save to catalogue</button>
          </form>
        </Card>
      )}
      <div className="flex flex-wrap gap-2">
        <input className={`${input} max-w-xs`} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={input} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <Card className="!p-0">
        <Scroll>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Title</th>
                <th className={th}>Author</th>
                <th className={th}>Category</th>
                <th className={th}>Acc.</th>
                <th className={th}>Copies</th>
                <th className={th}>Status</th>
                {canEdit && <th className={th}></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{r.title}</td>
                  <td className={td}>{r.author || '—'}</td>
                  <td className={td}>{r.category}</td>
                  <td className={td}>{r.accession_no || '—'}</td>
                  <td className={td}>{r.copies}</td>
                  <td className={td}>
                    {canEdit ? (
                      <select className="text-xs border rounded px-1 py-0.5" value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>
                        {STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      r.status
                    )}
                  </td>
                  {canEdit && (
                    <td className={td}>
                      <button type="button" className="text-red-600 text-xs font-bold" onClick={() => remove(r.id)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
      </Card>
    </div>
  )
}
