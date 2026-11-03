import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Card, Spinner, Alert, fmt } from '../components/ui'
import { BRAND_NAME } from '../brand'

/**
 * Public, no-login partner dashboard — /partner/:code
 *
 * A "partner" is not a ShuleMoja app user, so this does not sit behind auth.
 * The unguessable referral_code itself is the access token (same trust model
 * as a Stripe-style shareable dashboard link). Only one partner's own
 * aggregated numbers come back — see public.get_partner_stats() in
 * migrations/031_partner_program.sql, which never exposes the partners table.
 */
export default function PartnerStats({ code }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const { data, error: rpcError } = await supabase.rpc('get_partner_stats', { p_code: code })
        if (!alive) return
        if (rpcError) {
          setError(rpcError.message || 'Could not load partner stats')
        } else if (!data || data.ok !== true) {
          setError((data && data.error) || 'Partner code not found')
        } else {
          setStats(data)
        }
      } catch (e) {
        if (alive) setError(e?.message || 'Could not load partner stats')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [code])

  return (
    <div className="min-h-screen sk-mesh flex flex-col items-center p-4">
      <div className="w-full max-w-lg my-8 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-black text-white drop-shadow">{BRAND_NAME} Partner Dashboard</h1>
          <p className="text-slate-200/80 text-sm mt-1">Your referral stats — no login required.</p>
        </div>

        {loading ? (
          <Card>
            <div className="flex justify-center py-6">
              <Spinner dark />
            </div>
          </Card>
        ) : error ? (
          <Card>
            <Alert kind="error">{error}</Alert>
            <p className="text-xs text-slate-500 mt-2">
              Check the link your ShuleMoja contact shared with you, or ask them to resend it.
            </p>
          </Card>
        ) : stats ? (
          <>
            <Card title={stats.full_name}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-slate-600">Your code</span>
                <code className="text-lg font-black tracking-widest bg-slate-900 text-amber-300 px-3 py-1.5 rounded-xl">
                  {stats.referral_code}
                </code>
              </div>
              {stats.status !== 'active' && (
                <div className="mt-3">
                  <Alert kind="warn">This partner account is currently suspended — new signups won't be linked.</Alert>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 text-white bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg">
                <p className="text-[11px] font-black uppercase tracking-wide">Schools referred</p>
                <p className="text-2xl font-black mt-1">{stats.schools_referred}</p>
              </div>
              <div className="rounded-2xl p-4 text-white bg-gradient-to-br from-violet-600 to-purple-500 shadow-lg">
                <p className="text-[11px] font-black uppercase tracking-wide">Paying schools</p>
                <p className="text-2xl font-black mt-1">{stats.schools_confirmed}</p>
              </div>
              <div className="rounded-2xl p-4 text-white bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                <p className="text-[11px] font-black uppercase tracking-wide">Pending payout</p>
                <p className="text-2xl font-black mt-1">KSh {fmt(stats.pending_payout)}</p>
              </div>
              <div className="rounded-2xl p-4 text-white bg-gradient-to-br from-emerald-600 to-teal-500 shadow-lg">
                <p className="text-[11px] font-black uppercase tracking-wide">Paid lifetime</p>
                <p className="text-2xl font-black mt-1">KSh {fmt(stats.paid_lifetime)}</p>
              </div>
            </div>

            <p className="text-center text-xs text-slate-200/70">
              Bonuses are reviewed and paid manually via M-Pesa by {BRAND_NAME}. Pending payout updates as new schools pay.
            </p>
          </>
        ) : null}
      </div>
    </div>
  )
}
