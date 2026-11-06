/** Compose messages that open WhatsApp / SMS with editable text */
import { openPrintDocument } from './docHeader'

export function waCompose(phone, text) {
  if (!phone) return null
  let n = String(phone).replace(/\D/g, '')
  if (n.startsWith('0')) n = '254' + n.slice(1)
  if (n.length < 9) return null
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}

export function smsCompose(phone, text) {
  if (!phone) return null
  let n = String(phone).replace(/\D/g, '')
  if (n.startsWith('0')) n = '254' + n.slice(1)
  return `sms:${n}?body=${encodeURIComponent(text)}`
}

export function suspensionLetterText({ schoolName, studentName, admissionNo, reason, date }) {
  return (
    `${schoolName || 'School'}\n` +
    `SUSPENSION NOTICE\n\n` +
    `Student: ${studentName || '—'}${admissionNo ? ` (${admissionNo})` : ''}\n` +
    `Date: ${date || new Date().toLocaleDateString('en-GB')}\n` +
    `Reason: ${reason || 'As discussed with the school administration.'}\n\n` +
    `Please contact the school office for further information.\n` +
    `— Principal / Secretary`
  )
}

export function transferLetterText({ schoolName, studentName, admissionNo, destination, date }) {
  return (
    `${schoolName || 'School'}\n` +
    `TRANSFER / CLEARANCE LETTER\n\n` +
    `This is to confirm that ${studentName || 'the student'}` +
    `${admissionNo ? ` (Adm. ${admissionNo})` : ''} ` +
    `was a learner at ${schoolName || 'our school'}.\n\n` +
    `Effective: ${date || new Date().toLocaleDateString('en-GB')}\n` +
    `${destination ? `Destination: ${destination}\n` : ''}` +
    `\nWe wish them well in their future studies.\n` +
    `— Principal`
  )
}

/** Open printable HTML (centered header, watermark, brand footer) and trigger print/save as PDF */
export function printBrandedLetter({ school, title, bodyHtml }) {
  return openPrintDocument({
    school,
    title,
    bodyHtml: `<h2 style="font-size:16px;text-align:center;margin-top:8px">${title}</h2>
    <div style="line-height:1.55;font-size:14px;white-space:pre-wrap">${bodyHtml}</div>`,
  })
}
