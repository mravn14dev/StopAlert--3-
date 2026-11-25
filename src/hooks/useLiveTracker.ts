import { useCallback, useEffect, useRef, useState } from 'react'
import type { EscalationRecord, Journey, SmsResult } from '../types'
import { primeAudio, sendBrowserNotification, startAlarm, stopAlarmSound } from '../lib/alarm'
import {
  accuracyAllowsAlert,
  formatDistance,
  haversineMeters,
  interpolate,
  isLocationJump,
  pointFromDestination,
} from '../lib/geo'

export type GpsStatus =
  | 'idle'
  | 'requesting'
  | 'tracking'
  | 'poor-accuracy'
  | 'denied'
  | 'unavailable'
  | 'simulated'
  | 'jump-ignored'

type Fix = {
  lat: number
  lng: number
  accuracy: number
  at: number
  source: 'gps' | 'simulation'
}

function simulationStart(journey: Journey) {
  const enabled = journey.thresholds.filter((item) => item.enabled).map((item) => item.meters)
  const farthest = Math.max(...enabled, 500)
  const near = pointFromDestination(journey.destination, farthest * 1.15, 300)
  if (journey.origin) {
    const away = haversineMeters(journey.origin, journey.destination)
    if (away > farthest && away < 40_000) return journey.origin
  }
  return near
}

export function useLiveTracker(options: {
  journey: Journey | null
  passengerName: string
  sound: boolean
  vibration: boolean
  notifications: boolean
  onJourney: (journey: Journey) => void
}) {
  const { journey, passengerName, sound, vibration, notifications, onJourney } = options
  const journeyRef = useRef(journey)
  journeyRef.current = journey
  const onJourneyRef = useRef(onJourney)
  onJourneyRef.current = onJourney
  const prefs = useRef({ sound, vibration, notifications, passengerName })
  prefs.current = { sound, vibration, notifications, passengerName }

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle')
  const [gpsError, setGpsError] = useState('')
  const [notice, setNotice] = useState('')
  const [simulated, setSimulated] = useState(false)
  const [simRunning, setSimRunning] = useState(false)
  const [distanceM, setDistanceM] = useState<number | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [position, setPosition] = useState<Fix | null>(null)
  const [alarmMeters, setAlarmMeters] = useState<number | null>(null)
  const [silenced, setSilenced] = useState(false)
  const [countdownStart, setCountdownStart] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [escalating, setEscalating] = useState(false)
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null)
  const [roadMinutes, setRoadMinutes] = useState<number | null>(null)
  const [roadLine, setRoadLine] = useState<Array<{ lat: number; lng: number }> | null>(null)
  const [roadNote, setRoadNote] = useState('')

  const firedRef = useRef<Set<string>>(new Set())
  const lastFixRef = useRef<{ lat: number; lng: number; at: number } | null>(null)
  const speedPoints = useRef<Array<{ at: number; dist: number }>>([])
  const inFlight = useRef(false)
  const sentRef = useRef<string | null>(null)
  const lastSave = useRef(0)
  const simStartRef = useRef<{ lat: number; lng: number } | null>(null)
  const destinationRef = useRef(journey?.destination)
  destinationRef.current = journey?.destination

  const patch = useCallback((updater: (current: Journey) => Journey) => {
    const current = journeyRef.current
    if (!current) return
    const next = updater(current)
    journeyRef.current = next
    onJourneyRef.current(next)
  }, [])

  useEffect(() => {
    firedRef.current = new Set(journey?.thresholds.filter((item) => item.firedAt).map((item) => item.id) ?? [])
    lastFixRef.current = null
    speedPoints.current = []
    setDistanceM(null)
    setAccuracy(null)
    setPosition(null)
    setAlarmMeters(null)
    setSilenced(false)
    setCountdownStart(null)
    setEtaSeconds(null)
    setNotice('')
    setSimulated(false)
    setSimRunning(false)
    sentRef.current = journey && journey.escalations.length > 0 ? journey.id : null
    stopAlarmSound()
    if (!journey || journey.status !== 'active') return
    const fired = journey.thresholds.filter((item) => item.enabled && item.firedAt)
    if (!fired.length || journey.acknowledgedAt) return
    const earliest = Math.min(...fired.map((item) => new Date(item.firedAt as string).getTime()))
    const tightest = fired.reduce((a, b) => (a.meters < b.meters ? a : b))
    setAlarmMeters(tightest.meters)
    if (journey.emergency.enabled && journey.escalations.length === 0) setCountdownStart(earliest)
  }, [journey?.id])

  const applyFix = useCallback(
    (fix: Fix) => {
      const current = journeyRef.current
      if (!current || current.status !== 'active') return

      if (fix.source === 'gps' && lastFixRef.current) {
        if (
          isLocationJump(
            lastFixRef.current,
            { lat: fix.lat, lng: fix.lng, at: fix.at },
            current.mode,
          )
        ) {
          setGpsStatus('jump-ignored')
          setNotice('A sudden location jump was ignored so it could not trigger a false alert.')
          return
        }
      }
      if (fix.source === 'gps' && fix.accuracy > 2000) {
        setGpsStatus('poor-accuracy')
        setAccuracy(fix.accuracy)
        setNotice('This fix is coarser than 2 km, so it is not used for distance or alerts.')
        return
      }

      lastFixRef.current = { lat: fix.lat, lng: fix.lng, at: fix.at }
      const dist = haversineMeters(fix, current.destination)
      setDistanceM(dist)
      setAccuracy(fix.source === 'simulation' ? null : fix.accuracy)
      setPosition(fix)
      setGpsStatus(fix.source === 'simulation' ? 'simulated' : 'tracking')
      setNotice(fix.source === 'simulation' ? 'This point is simulated on this device. It is not GPS.' : '')

      if (fix.source === 'gps') {
        speedPoints.current = [
          ...speedPoints.current.filter((point) => fix.at - point.at < 120_000),
          { at: fix.at, dist },
        ].slice(-8)
        const oldest = speedPoints.current[0]
        const dt = oldest ? (fix.at - oldest.at) / 1000 : 0
        if (oldest && dt > 8) {
          const speed = (oldest.dist - dist) / dt
          const max = current.mode === 'train' ? 90 : 45
          setEtaSeconds(speed > 1 && speed < max ? dist / speed : null)
        }
      } else {
        setEtaSeconds(null)
      }

      const pending = current.thresholds.filter((item) => item.enabled && !firedRef.current.has(item.id))
      const crossed = pending.filter(
        (item) =>
          dist <= item.meters &&
          (fix.source === 'simulation' || accuracyAllowsAlert(fix.accuracy, item.meters)),
      )
      let nextThresholds = current.thresholds
      if (crossed.length) {
        const tightest = crossed.reduce((a, b) => (a.meters < b.meters ? a : b))
        const firedAt = new Date(fix.at).toISOString()
        crossed.forEach((item) => firedRef.current.add(item.id))
        nextThresholds = current.thresholds.map((item) =>
          crossed.some((hit) => hit.id === item.id) ? { ...item, firedAt } : item,
        )
        setAlarmMeters(tightest.meters)
        setSilenced(false)
        if (prefs.current.sound || prefs.current.vibration) {
          startAlarm({ audible: prefs.current.sound, vibrate: prefs.current.vibration })
        }
        if (prefs.current.notifications) {
          void sendBrowserNotification(
            `Approaching ${current.destination.name}`,
            `You are within ${formatDistance(tightest.meters)}. This alert uses distance, not a clock.`,
          )
        }
        if (
          current.emergency.enabled &&
          !current.acknowledgedAt &&
          current.escalations.length === 0
        ) {
          setCountdownStart((start) => start ?? fix.at)
        }
      }

      const initialMissing = current.initialDistanceM == null
      if (fix.at - lastSave.current > 4000 || crossed.length > 0 || initialMissing) {
        lastSave.current = fix.at
        patch((item) => ({
          ...item,
          thresholds: nextThresholds,
          initialDistanceM: item.initialDistanceM ?? dist,
          lastPosition: {
            lat: fix.lat,
            lng: fix.lng,
            accuracy: fix.accuracy,
            at: new Date(fix.at).toISOString(),
            source: fix.source,
          },
        }))
      }
    },
    [patch],
  )

  const applyFixRef = useRef(applyFix)
  applyFixRef.current = applyFix

  useEffect(() => {
    if (!journey || journey.status !== 'active' || simulated) return
    if (!('geolocation' in navigator)) {
      setGpsStatus('unavailable')
      setGpsError('This browser does not expose location.')
      return
    }
    setGpsStatus('requesting')
    setGpsError('')
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        applyFixRef.current({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          at: pos.timestamp || Date.now(),
          source: 'gps',
        })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus('denied')
          setGpsError('Location permission is off. Allow it for this site, or run the presentation simulation.')
          return
        }
        if (error.code === error.POSITION_UNAVAILABLE) {
          setGpsStatus('unavailable')
          setGpsError('The browser could not determine a position.')
          return
        }
        setGpsError('Still waiting for a location fix.')
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(watch)
  }, [journey?.id, journey?.status, simulated])

  useEffect(() => {
    if (!simRunning) return
    const start = simStartRef.current
    const destination = destinationRef.current
    if (!start || !destination) return
    const began = performance.now()
    const duration = 52000
    const timer = window.setInterval(() => {
      const point = interpolate(start, destination, Math.min(1, (performance.now() - began) / duration))
      applyFixRef.current({
        lat: point.lat,
        lng: point.lng,
        accuracy: 12,
        at: Date.now(),
        source: 'simulation',
      })
      if ((performance.now() - began) / duration >= 1) {
        window.clearInterval(timer)
        setSimRunning(false)
      }
    }, 450)
    return () => window.clearInterval(timer)
  }, [simRunning])

  useEffect(() => () => stopAlarmSound(), [])

  useEffect(() => {
    if (alarmMeters == null) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [alarmMeters])

  const countdownMs =
    countdownStart != null && journey?.emergency.enabled && !journey.acknowledgedAt && journey.escalations.length === 0
      ? countdownStart + journey.emergency.waitSeconds * 1000 - now
      : null

  const sendEscalation = useCallback(async (force = false) => {
    const current = journeyRef.current
    if (!current?.lastPosition || inFlight.current) return
    if (!force && sentRef.current === current.id) return
    sentRef.current = current.id
    inFlight.current = true
    setEscalating(true)
    const recordBase = { id: crypto.randomUUID(), at: new Date().toISOString() }
    const etaText =
      etaSeconds != null
        ? `Rough ETA ${Math.max(1, Math.round(etaSeconds / 60))} min from recent movement. This is not a timetable.`
        : 'Estimated arrival is unavailable.'
    try {
      const response = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passengerName: prefs.current.passengerName,
          destination: current.destination.name,
          remainingMeters: distanceM ?? haversineMeters(current.lastPosition, current.destination),
          etaText,
          lat: current.lastPosition.lat,
          lng: current.lastPosition.lng,
          contactName: current.emergency.contactName,
          contactPhone: current.emergency.contactPhone,
        }),
      })
      const data = (await response.json().catch(() => null)) as (SmsResult & { error?: string }) | null
      let record: EscalationRecord
      if (!response.ok || !data || (data.mode !== 'simulated' && data.mode !== 'twilio' && data.mode !== 'whatsapp')) {
        record = {
          ...recordBase,
          mode: 'failed',
          accepted: false,
          delivered: false,
          detail: data?.error || data?.detail || 'The notification service could not be reached. Nothing was sent.',
        }
      } else {
        record = {
          ...recordBase,
          mode: data.mode,
          accepted: Boolean(data.accepted),
          delivered: Boolean(data.delivered),
          detail: data.detail,
          preview: data.preview,
          providerStatus: data.providerStatus,
        }
      }
      patch((item) => ({ ...item, escalations: [...item.escalations, record] }))
    } catch {
      patch((item) => ({
        ...item,
        escalations: [
          ...item.escalations,
          {
            ...recordBase,
            mode: 'failed',
            accepted: false,
            delivered: false,
            detail: 'The notification service could not be reached. Nothing was sent.',
          },
        ],
      }))
    } finally {
      inFlight.current = false
      setEscalating(false)
    }
  }, [distanceM, etaSeconds, patch])

  useEffect(() => {
    if (countdownMs == null || countdownMs > 0) return
    if (!journey || journey.acknowledgedAt || !journey.emergency.enabled) return
    if (sentRef.current === journey.id) return
    void sendEscalation()
  }, [countdownMs, journey, sendEscalation])

  const originKey = journey?.origin ? `${journey.origin.lat.toFixed(5)},${journey.origin.lng.toFixed(5)}` : ''
  const destinationKey = journey
    ? `${journey.destination.lat.toFixed(5)},${journey.destination.lng.toFixed(5)}`
    : ''

  useEffect(() => {
    if (!journey || journey.mode !== 'bus' || journey.status !== 'active') {
      setRoadLine(null)
      setRoadMinutes(null)
      setRoadNote(
        journey?.mode === 'train'
          ? 'Rail paths are not guessed. The line on the map is straight-line distance to the station, not a train route or a live train.'
          : '',
      )
      return
    }
    if (!journey.origin) {
      setRoadLine(null)
      setRoadMinutes(null)
      setRoadNote('A road estimate needs a starting point with coordinates. Distance alerts still use straight-line GPS distance.')
      return
    }
    const controller = new AbortController()
    const url = `https://router.project-osrm.org/route/v1/driving/${journey.origin.lng},${journey.origin.lat};${journey.destination.lng},${journey.destination.lat}?overview=full&geometries=geojson`
    fetch(url, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const coords = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined
        const duration = data?.routes?.[0]?.duration as number | undefined
        if (!coords?.length) {
          setRoadNote('A road-routing estimate is unavailable. Distance shown is straight-line.')
          return
        }
        setRoadLine(coords.map(([lng, lat]) => ({ lat, lng })))
        setRoadMinutes(typeof duration === 'number' ? duration / 60 : null)
        setRoadNote('The solid line is a road-routing estimate, not an official bus route and not a live bus position.')
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRoadNote('A road-routing estimate is unavailable. Distance shown is straight-line.')
        }
      })
    return () => controller.abort()
    // Keys capture the coordinates. The journey object itself updates on every GPS save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey?.id, journey?.mode, journey?.status, originKey, destinationKey])

  function startSimulation() {
    const current = journeyRef.current
    if (!current) return
    primeAudio()
    simStartRef.current = simulationStart(current)
    lastFixRef.current = null
    speedPoints.current = []
    setSimulated(true)
    setSimRunning(true)
    setGpsError('')
  }

  function stopSimulation() {
    setSimRunning(false)
    setSimulated(false)
    setGpsStatus('requesting')
    setNotice('')
  }

  function acknowledge() {
    stopAlarmSound()
    setAlarmMeters(null)
    setSilenced(false)
    setCountdownStart(null)
    patch((item) => ({ ...item, acknowledgedAt: new Date().toISOString() }))
  }

  function silence() {
    stopAlarmSound()
    setSilenced(true)
  }

  function resumeSound() {
    if (alarmMeters == null) return
    setSilenced(false)
    startAlarm({ audible: prefs.current.sound, vibrate: prefs.current.vibration })
  }

  return {
    gpsStatus,
    gpsError,
    notice,
    simulated,
    simRunning,
    distanceM,
    accuracy,
    position,
    alarmMeters,
    silenced,
    countdownMs,
    escalating,
    etaSeconds,
    roadMinutes,
    roadLine,
    roadNote,
    startSimulation,
    stopSimulation,
    acknowledge,
    silence,
    resumeSound,
    retryEscalation: sendEscalation,
  }
}
