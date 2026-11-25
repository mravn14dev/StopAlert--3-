import { useEffect, useMemo } from 'react'
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { LatLng } from '../types'

const youIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:999px;background:#2f6bff;border:3px solid #fff;box-shadow:0 0 0 7px rgba(47,107,255,.28)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const destIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:999px 999px 999px 2px;transform:rotate(-45deg);background:#0b1220;border:3px solid #fff;box-shadow:0 6px 16px rgba(11,18,32,.35)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 16],
})

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap()
  const key = points.map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`).join('|')
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13)
      return
    }
    map.fitBounds(
      points.map((point) => [point.lat, point.lng] as [number, number]),
      { padding: [36, 36], maxZoom: 15 },
    )
  }, [map, key, points])
  return null
}

export function JourneyMap({
  destination,
  position,
  origin,
  roadLine,
  thresholds = [],
  className = 'h-[360px]',
}: {
  destination?: LatLng | null
  position?: LatLng | null
  origin?: LatLng | null
  roadLine?: LatLng[] | null
  thresholds?: number[]
  className?: string
}) {
  const points = useMemo(() => {
    const list: LatLng[] = []
    if (destination) list.push(destination)
    if (position) list.push(position)
    if (origin) list.push(origin)
    return list
  }, [destination, position, origin])

  if (!destination) {
    return (
      <div
        className={`grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-white/15 dark:bg-navy-900 dark:text-slate-400 ${className}`}
      >
        The map appears after a destination is selected.
      </div>
    )
  }

  const straight: [number, number][] | null =
    position && !roadLine?.length
      ? [
          [position.lat, position.lng],
          [destination.lat, destination.lng],
        ]
      : origin && !position && !roadLine?.length
        ? [
            [origin.lat, origin.lng],
            [destination.lat, destination.lng],
          ]
        : null

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 ${className}`}>
      <MapContainer
        center={[destination.lat, destination.lng]}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {thresholds.map((meters) => (
          <Circle
            key={meters}
            center={[destination.lat, destination.lng]}
            radius={meters}
            pathOptions={{ color: '#2f6bff', weight: 1, fillOpacity: 0.04 }}
          />
        ))}
        {roadLine && roadLine.length > 1 ? (
          <Polyline
            positions={roadLine.map((point) => [point.lat, point.lng] as [number, number])}
            pathOptions={{ color: '#2f6bff', weight: 4, opacity: 0.9 }}
          />
        ) : null}
        {straight ? (
          <Polyline positions={straight} pathOptions={{ color: '#2f6bff', weight: 3, dashArray: '8 8', opacity: 0.85 }} />
        ) : null}
        {origin ? <Circle center={[origin.lat, origin.lng]} radius={80} pathOptions={{ color: '#64748b', weight: 1 }} /> : null}
        {position ? <Marker position={[position.lat, position.lng]} icon={youIcon} /> : null}
        <Marker position={[destination.lat, destination.lng]} icon={destIcon} />
      </MapContainer>
    </div>
  )
}
