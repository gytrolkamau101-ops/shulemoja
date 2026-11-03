import { Alert, btnGreen } from '../../components/ui'
import { DEFAULT_PLANS } from '../../lib/plans'
import { DEFAULT_PRIVACY } from '../../lib/privacyDefault'

/** Public CMS pages from login: pricing, terms, privacy, how, contact */
export default function CmsViews({
  view,
  setView,
  bgStyle,
  pricing,
  terms,
  how,
  contacts,
  cmsPrivacy,
  configErr,
  error,
  info,
  payBusy,
  openPayForm,
}) {
  const page =
    view === 'pricing'
      ? null
      : view === 'terms'
        ? terms
        : view === 'privacy'
          ? cmsPrivacy && (cmsPrivacy.title || cmsPrivacy.body)
            ? cmsPrivacy
            : DEFAULT_PRIVACY
          : view === 'how'
            ? how
            : contacts

  return (
    <div className="min-h-screen flex flex-col items-center p-4" style={bgStyle}>
      <div className="w-full max-w-lg sk-glass rounded-2xl p-6 my-8 space-y-4">
        <button type="button" className="text-sm font-bold text-blue-700" onClick={() => setView('auth')}>
          ← Back
        </button>
        {view === 'pricing' ? (
          <>
            <h2 className="text-2xl font-black text-slate-900">Choose a plan</h2>
            <p className="text-sm text-slate-600">Pay with M-Pesa / card via IntaSend. After payment, register or log in as Principal.</p>
            {configErr && <Alert kind="error">{configErr}</Alert>}
            <Alert>{error}</Alert>
            {info && <Alert kind="ok">{info}</Alert>}
            <div className="space-y-3">
              {(pricing?.plans?.length ? pricing.plans : DEFAULT_PLANS.plans).map((plan) => (
                <div key={plan.id || plan.name} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-black text-lg">{plan.name}</p>
                      <p className="text-sm text-slate-500">{plan.period}</p>
                    </div>
                    <p className="font-black text-blue-700">
                      {Number(plan.price) <= 0 ? 'Free' : `${pricing.currency || 'KES'} ${Number(plan.price).toLocaleString()}`}
                    </p>
                  </div>
                  <button type="button" disabled={payBusy} className={`${btnGreen} w-full mt-3`} onClick={() => openPayForm(plan)}>
                    {Number(plan.price) <= 0 ? 'Start free' : 'Pay & subscribe'}
                  </button>
                </div>
              ))}
              {!(pricing?.plans || []).length && (
                <p className="text-sm text-slate-500">Pricing not configured yet. Super Admin → Pricing.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-black text-slate-900">{page?.title || view}</h2>
            {view === 'contact' ? (
              <div className="text-sm text-slate-700 space-y-2">
                <p>Email: {contacts?.email || '—'}</p>
                <p>Phone: {contacts?.phone || '—'}</p>
                <p>WhatsApp: {contacts?.whatsapp || '—'}</p>
                <p>Address: {contacts?.address || '—'}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{page?.body || 'Content coming soon.'}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
