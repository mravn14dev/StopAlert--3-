import type { Place, TransportMode } from '../types'

type Hit = {
  id: string
  name: string
  detail: string
  lat: number
  lng: number
}

export async function geocodePlaces(query: string, mode: TransportMode) {
  try {
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
    const data = (await response.json().catch(() => null)) as { results?: Hit[]; error?: string } | null
    if (!response.ok) {
      return {
        results: [] as Place[],
        error: data?.error || 'Place search is unavailable. The sample directory below still works.',
      }
    }
    const results: Place[] = (data?.results || [])
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
      .map((item) => ({
        id: item.id,
        name: item.name,
        detail: item.detail,
        lat: item.lat,
        lng: item.lng,
        kind: mode === 'train' ? 'station' : 'stop',
        source: 'nominatim',
      }))
    return { results, error: null as string | null }
  } catch {
    return {
      results: [] as Place[],
      error: 'Place search could not be reached. The sample directory below still works.',
    }
  }
}
