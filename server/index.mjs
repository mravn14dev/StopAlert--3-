import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { geocodeQuery, getHealthPayload, handleEmergency, twilioConfig } from './core.mjs'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 8787)
const app = express()

app.use(cors())
app.use(express.json({ limit: '20kb' }))

function clientIp(req) {
  return req.ip || req.socket.remoteAddress || 'unknown'
}

app.get('/api/health', (_req, res) => {
  res.json(getHealthPayload())
})

app.get('/api/geocode', async (req, res) => {
  const result = await geocodeQuery(req.query.q)
  res.status(result.status).json(result.body)
})

app.post('/api/emergency', async (req, res) => {
  const result = await handleEmergency(req.body, clientIp(req))
  res.status(result.status).json(result.body)
})

const dist = path.join(__dirname, '..', 'dist')
if (fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist))
  app.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api')) {
      next()
      return
    }
    res.sendFile(path.join(dist, 'index.html'))
  })
}

app.listen(PORT, '127.0.0.1', () => {
  const mode = twilioConfig().ready ? 'twilio' : 'simulated'
  console.log(`StopAlert API on http://127.0.0.1:${PORT} (SMS ${mode})`)
})
