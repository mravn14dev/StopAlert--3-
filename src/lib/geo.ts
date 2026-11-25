import type { LatLng, TransportMode } from '../types'

const EARTH_M = 6_371_000

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

export function haversineMeters(a: LatLng, b: LatLng) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatDistance(meters: number) {
  if (!Number.isFinite(meters)) return '—'
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  if (km >= 100 || Math.abs(km - Math.round(km)) < 0.001) return `${Math.round(km)} km`
  if (km >= 10) return `${km.toFixed(1)} km`
  return `${(Math.round(km * 10) / 10).toFixed(1)} km`
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  const total = Math.round(seconds)
  if (total < 60) return `${total} sec`
  const minutes = Math.round(total / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours} hr ${rest} min`
}

export function countdownLabel(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Hold an alert when the GPS error circle is too large for that distance. */
export function accuracyAllowsAlert(accuracyM: number, thresholdM: number) {
  if (!Number.isFinite(accuracyM) || accuracyM <= 0) return false
  if (thresholdM <= 500) return accuracyM <= 75
  if (thresholdM <= 2000) return accuracyM <= 150
  if (thresholdM <= 5000) return accuracyM <= 400
  return accuracyM <= 1000
}

/**
 * Ignore a fix that implies an impossible jump. Pauses longer than 15 seconds
 * are allowed, because a tunnel or a stalled browser can create a real gap.
 */
export function isLocationJump(
  prev: LatLng & { at: number },
  next: LatLng & { at: number },
  mode: TransportMode,
) {
  const dt = (next.at - prev.at) / 1000
  if (dt <= 0) return true
  if (dt >= 15) return false
  const dist = haversineMeters(prev, next)
  if (dt < 1) return dist > 120
  const maxMps = mode === 'train' ? 95 : 50
  return dist / dt > maxMps
}

export function pointFromDestination(dest: LatLng, distanceM: number, bearingDeg: number): LatLng {
  const δ = distanceM / EARTH_M
  const θ = toRad(bearingDeg)
  const φ1 = toRad(dest.lat)
  const λ1 = toRad(dest.lng)
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ))
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    )
  return { lat: (φ2 * 180) / Math.PI, lng: ((((λ2 * 180) / Math.PI + 540) % 360) - 180) }
}

export function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  const u = Math.min(1, Math.max(0, t))
  return {
    lat: a.lat + (b.lat - a.lat) * u,
    lng: a.lng + (b.lng - a.lng) * u,
  }
}

export function accuracyWord(meters?: number) {
  if (meters == null || !Number.isFinite(meters)) return 'Unknown'
  if (meters <= 30) return 'Good'
  if (meters <= 100) return 'Fair'
  return 'Poor'
}

export function mapsLink(lat: number, lng: number) {
  const la = lat.toFixed(5)
  const ln = lng.toFixed(5)
  return `https://www.openstreetmap.org/?mlat=${la}&mlon=${ln}#map=16/${la}/${ln}`
}
