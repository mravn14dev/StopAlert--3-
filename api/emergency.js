import { handleEmergency } from '../server/core.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const forwarded = req.headers['x-forwarded-for']
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') ||
    req.socket?.remoteAddress ||
    'unknown'
  let body = {}
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body || '{}')
    } catch {
      res.status(400).json({ error: 'Invalid JSON request body.' })
      return
    }
  } else {
    body = req.body || {}
  }
  const result = await handleEmergency(body, ip)
  res.status(result.status).json(result.body)
}
