const hits = new Map()

export function rateLimited(ip) {
  const now = Date.now()
  const windowMs = 10 * 60 * 1000
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs)
  if (recent.length >= 8) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  return false
}

export function normalizePhone(value) {
  const cleaned = clean(value, 24).replace(/[\s()-]/g, '')
  if (/^[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned}`
  if (/^0[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned.slice(1)}`
  if (/^91[6-9]\d{9}$/.test(cleaned)) return `+${cleaned}`
  return cleaned
}

export function twilioConfig() {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim() || ''
  const token = process.env.TWILIO_AUTH_TOKEN?.trim() || ''
  const from = process.env.TWILIO_FROM_NUMBER?.trim() || ''
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM?.trim() || ''
  return {
    sid,
    token,
    from,
    whatsappFrom,
    ready: Boolean(sid && token && (from || whatsappFrom)),
  }
}

export function metaWhatsappConfig() {
  const token = process.env.WHATSAPP_TOKEN?.trim() || ''
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || ''
  return {
    token,
    phoneNumberId,
    ready: Boolean(token && phoneNumberId),
  }
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return 'an unknown distance'
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  return `${km < 10 ? km.toFixed(1) : km.toFixed(0)} km`
}

export function clean(value, max) {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

export function buildPreview(body) {
  const name = clean(body.passengerName, 80) || 'A passenger'
  const destination = clean(body.destination, 120) || 'their stop'
  const remaining = Number(body.remainingMeters)
  const eta = clean(body.etaText, 160) || 'Estimated arrival is unavailable.'
  const lat = Number(body.lat)
  const lng = Number(body.lng)
  const link = `https://www.openstreetmap.org/?mlat=${lat.toFixed(5)}&mlon=${lng.toFixed(5)}#map=16/${lat.toFixed(5)}/${lng.toFixed(5)}`
  return `StopAlert: ${name} has not responded near ${destination}. About ${formatDistance(remaining)} remaining. ${eta} Last location: ${link}`
}

export function validatePayload(body) {
  const lat = Number(body?.lat)
  const lng = Number(body?.lng)
  const remaining = Number(body?.remainingMeters)
  const phone = normalizePhone(body?.contactPhone)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return 'A valid last-known location is required.'
  }
  if (!Number.isFinite(remaining) || remaining < 0 || remaining > 500_000) {
    return 'Remaining distance is missing or invalid.'
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return 'Emergency contact phone must be a 10-digit Indian number or international format (e.g. +919876543210).'
  }
  if (!clean(body?.contactName, 80)) return 'Emergency contact name is required.'
  if (!clean(body?.passengerName, 80)) return 'Passenger name is required.'
  if (!clean(body?.destination, 120)) return 'Destination is required.'
  return null
}

export function getHealthPayload() {
  const twilio = twilioConfig()
  const meta = metaWhatsappConfig()
  return {
    ok: true,
    sms: meta.ready ? 'whatsapp' : twilio.ready ? 'twilio' : 'simulated',
  }
}

export async function geocodeQuery(rawQuery) {
  const q = clean(rawQuery, 120)
  if (q.length < 3) {
    return { status: 400, body: { error: 'Enter at least 3 characters to search.' } }
  }
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', '6')
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'StopAlertDemo/1.0 (university project; web demo)',
      },
    })
    if (!response.ok) {
      return { status: 502, body: { error: 'Place search is unavailable right now.' } }
    }
    const data = await response.json()
    const results = Array.isArray(data)
      ? data.slice(0, 6).map((item) => ({
          id: `osm-${item.place_id}`,
          name: item.name || String(item.display_name || '').split(',')[0] || 'Place',
          detail: item.display_name || '',
          lat: Number(item.lat),
          lng: Number(item.lon),
          source: 'nominatim',
        }))
      : []
    return { status: 200, body: { results } }
  } catch {
    return { status: 502, body: { error: 'Place search could not be reached.' } }
  }
}

export async function handleEmergency(rawBody, ip) {
  if (rateLimited(ip)) {
    return {
      status: 429,
      body: { error: 'Too many notification attempts. Wait a few minutes and try again.' },
    }
  }

  const body = rawBody || {}
  const error = validatePayload(body)
  if (error) {
    return { status: 400, body: { error } }
  }

  const preview = buildPreview(body)
  const phone = normalizePhone(body.contactPhone)
  const testOnly = Boolean(body?.testOnly)
  const twilio = twilioConfig()
  const meta = metaWhatsappConfig()

  if (testOnly || (!twilio.ready && !meta.ready)) {
    const reason = testOnly
      ? 'This is a test preview. The server did not call a messaging provider.'
      : 'No SMS or WhatsApp provider is configured on the server. Nothing was sent automatically. You can still tap Message on WhatsApp below.'
    return {
      status: 200,
      body: {
        mode: 'simulated',
        accepted: false,
        delivered: false,
        preview,
        detail: reason,
      },
    }
  }

  if (meta.ready) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(meta.phoneNumberId)}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${meta.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone.replace(/\D/g, ''),
            type: 'text',
            text: { body: preview },
          }),
        },
      )
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = clean(data?.error?.message, 180) || 'WhatsApp Cloud API rejected the message.'
        return {
          status: 502,
          body: {
            mode: 'whatsapp',
            accepted: false,
            delivered: false,
            preview,
            detail: `WhatsApp did not accept the message. ${message}`,
          },
        }
      }
      return {
        status: 200,
        body: {
          mode: 'whatsapp',
          accepted: true,
          delivered: false,
          providerStatus: 'accepted',
          providerSid: clean(data?.messages?.[0]?.id, 80),
          preview,
          detail: 'WhatsApp Cloud API accepted the message. Handset delivery is not confirmed.',
        },
      }
    } catch {
      return {
        status: 502,
        body: {
          mode: 'whatsapp',
          accepted: false,
          delivered: false,
          preview,
          detail: 'WhatsApp Cloud API could not be reached. Nothing was confirmed as sent.',
        },
      }
    }
  }

  const useWhatsapp = Boolean(twilio.whatsappFrom)
  const fromNumber = useWhatsapp
    ? twilio.whatsappFrom.startsWith('whatsapp:')
      ? twilio.whatsappFrom
      : `whatsapp:${twilio.whatsappFrom}`
    : twilio.from
  const toNumber = useWhatsapp ? `whatsapp:${phone}` : phone

  const params = new URLSearchParams({
    To: toNumber,
    From: fromNumber,
    Body: preview,
  })

  try {
    const auth = Buffer.from(`${twilio.sid}:${twilio.token}`).toString('base64')
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twilio.sid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      },
    )
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = clean(data?.message, 180) || 'The messaging provider rejected the message.'
      return {
        status: 502,
        body: {
          mode: useWhatsapp ? 'whatsapp' : 'twilio',
          accepted: false,
          delivered: false,
          preview,
          detail: `Twilio did not accept the message. ${message}`,
        },
      }
    }
    const providerStatus = clean(data.status, 40) || 'unknown'
    const delivered = providerStatus === 'delivered'
    return {
      status: 200,
      body: {
        mode: useWhatsapp ? 'whatsapp' : 'twilio',
        accepted: true,
        delivered,
        providerStatus,
        providerSid: clean(data.sid, 64),
        preview,
        detail: delivered
          ? `Twilio confirmed ${useWhatsapp ? 'WhatsApp' : 'SMS'} delivery to the handset.`
          : `Twilio accepted the ${useWhatsapp ? 'WhatsApp' : 'SMS'} message with status "${providerStatus}". Handset delivery is not confirmed.`,
      },
    }
  } catch {
    return {
      status: 502,
      body: {
        mode: useWhatsapp ? 'whatsapp' : 'twilio',
        accepted: false,
        delivered: false,
        preview,
        detail: 'The messaging provider could not be reached. Nothing was confirmed as sent.',
      },
    }
  }
}
