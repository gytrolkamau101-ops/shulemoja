/**
 * Shared printable/downloadable document chrome: centered school header,
 * a subtle ShuleMoja watermark, and a consistent brand footer.
 * Used by every print/PDF-style document in the app (report cards, class
 * registers, fee statements/receipts, admission/suspension/transfer
 * letters, circulars) so the layout doesn't drift between files.
 */
import { BRAND_NAME, COMPANY_NAME } from '../brand'

/** Centered header: logo (if any), school name, and address/contact/motto line. */
export function docHeaderHtml(school) {
  const logo = school?.logo_url
    ? `<img src="${school.logo_url}" alt="" style="max-height:64px;margin:0 auto 8px;display:block"/>`
    : ''
  const subParts = [school?.po_box, school?.motto, school?.phone, school?.email].filter(
    (v) => v && String(v).trim()
  )
  const sub = subParts.join(' · ')
  return `<div style="text-align:center;margin-bottom:16px">
    ${logo}
    <h1 style="font-size:20px;margin:4px 0;text-align:center">${school?.school_name || 'School'}</h1>
    ${sub ? `<div style="text-align:center;color:#475569;font-size:12px">${sub}</div>` : ''}
  </div>`
}

/** True for Free/Basic only — Premium & Pro documents stay clean. */
export function shouldWatermark(school) {
  const p = String(school?.plan || school?.plan_id || 'free').toLowerCase()
  if (p === 'premium' || p === 'pro' || p === 'custom' || p === 'yearly') return false
  // Free + Basic (+ trial treated as basic branding): watermark on printables
  // Premium & Pro: no watermark
  return true
}

/** Subtle full-page diagonal watermark — Basic/Free documents only. */
export function watermarkHtml(school) {
  if (school && !shouldWatermark(school)) return ''
  return `<div aria-hidden="true" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0.07;font-size:64px;font-weight:900;transform:rotate(-28deg);color:#0f172a;z-index:0;overflow:hidden">${BRAND_NAME}</div>`
}

/** Consistent brand footer, e.g. "ShuleMoja by BigDataKE Technologies". */
export function docFooterHtml() {
  return `<div style="margin-top:32px;text-align:center;font-size:10px;color:#94a3b8">${BRAND_NAME} by ${COMPANY_NAME}</div>`
}

/**
 * Full standalone HTML for a printable document, with centered header,
 * watermark and footer wired in around the caller's bodyHtml.
 */
export function buildPrintDocument({ school, title, bodyHtml, extraStyles = '' }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title || BRAND_NAME}</title>
  <style>
    body{font-family:system-ui,Segoe UI,sans-serif;color:#0f172a;margin:0;padding:24px;max-width:900px;margin-left:auto;margin-right:auto;position:relative}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}
    th{background:#f1f5f9}
    .no-print{display:inline-block}
    @media print{.no-print{display:none} body{padding:12px}}
    ${extraStyles}
  </style></head><body>
  ${watermarkHtml(school)}
  <div style="position:relative;z-index:1">
    ${docHeaderHtml(school)}
    ${bodyHtml}
    ${docFooterHtml()}
  </div>
  <script>window.onload=function(){setTimeout(function(){try{window.print()}catch(e){}},300)}<\/script>
  </body></html>`
}

/** Opens a new window/tab, writes the printable document, and triggers print. */
export function openPrintDocument({ school, title, bodyHtml, extraStyles }) {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(buildPrintDocument({ school, title, bodyHtml, extraStyles }))
  w.document.close()
  return true
}
