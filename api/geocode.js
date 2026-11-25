import { geocodeQuery } from '../server/core.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const result = await geocodeQuery(req.query?.q)
  res.status(result.status).json(result.body)
}
