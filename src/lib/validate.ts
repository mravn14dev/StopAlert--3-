export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function normalizePhone(value: string) {
  const cleaned = value.replace(/[\s()-]/g, '').trim()
  if (/^[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned}`
  if (/^0[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned.slice(1)}`
  if (/^91[6-9]\d{9}$/.test(cleaned)) return `+${cleaned}`
  return cleaned
}

export function isE164(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(normalizePhone(value))
}

export function whatsappLink(phone: string, text?: string) {
  const digits = normalizePhone(phone).replace(/\D/g, '')
  if (!digits) return ''
  const base = `https://wa.me/${digits}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
