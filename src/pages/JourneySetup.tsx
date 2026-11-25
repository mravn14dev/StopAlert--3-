import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bus, LocateFixed, Train } from 'lucide-react'
import { JourneyMap } from '../components/JourneyMap'
import { Banner, Button, Card, Field, Input, Pill } from '../components/ui'
import { useApp } from '../context/AppState'
import { searchSample, toPlace } from '../lib/catalog'
import { formatDistance } from '../lib/geo'
import { geocodePlaces } from '../lib/places'
import { isE164, normalizePhone } from '../lib/validate'
import type { LatLng, Place, TransportMode } from '../types'
import { useTitle } from '../hooks/useDeviceStatus'
import { cx } from '../lib/cx'

const STEPS = ['Transport', 'Start', 'Destination', 'Alerts', 'Emergency', 'Review']
const PRESETS = [10000, 5000, 2000, 500]

export function JourneySetupPage() {
  const { settings, contacts, activeJourney, saveJourney } = useApp()
  const navigate = useNavigate()
  const primary = contacts.find((contact) => contact.primary) || contacts[0]
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<TransportMode | null>(null)
  const [originLabel, setOriginLabel] = useState('')
  const [origin, setOrigin] = useState<LatLng | undefined>()
  const [originNote, setOriginNote] = useState('')
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState<Place[]>([])
  const [searchError, setSearchError] = useState('')
  const [searching, setSearching] = useState(false)
  const [destination, setDestination] = useState<Place | null>(null)
  const [selected, setSelected] = useState<number[]>(settings.defaultThresholds)
  const [custom, setCustom] = useState('')
  const [contactName, setContactName] = useState(primary?.name || '')
  const [contactPhone, setContactPhone] = useState(primary?.phone || '')
  const [enabled, setEnabled] = useState(true)
  const [waitSeconds, setWaitSeconds] = useState(settings.defaultWaitSeconds)
  const [error, setError] = useState('')
  useTitle('New journey')

  const samples = useMemo(() => (mode ? searchSample(query, mode).map(toPlace) : []), [mode, query])

  function toggleDistance(meters: number) {
    setSelected((current) =>
      current.includes(meters) ? current.filter((item) => item !== meters) : [...current, meters].sort((a, b) => b - a),
    )
  }

  function addCustom() {
    const meters = Math.round(Number(custom))
    if (!Number.isFinite(meters) || meters < 200 || meters > 80000) {
      setError('Custom distance must be between 200 m and 80 km.')
      return
    }
    setError('')
    setSelected((current) => (current.includes(meters) ? current : [...current, meters].sort((a, b) => b - a)))
    setCustom('')
  }

  async function locate() {
    setOriginNote('')
    if (!navigator.geolocation) {
      setOriginNote('This browser does not expose location.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        if (!originLabel.trim()) setOriginLabel('Current location')
        setOriginNote(`Saved a start coordinate, accurate to about ${Math.round(pos.coords.accuracy)} m.`)
      },
      () => setOriginNote('Location permission was denied or timed out. You can still type a start name.'),
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  async function search() {
    if (!mode) return
    if (query.trim().length < 3) {
      setSearchError('Enter at least 3 characters to search the map.')
      return
    }
    setSearching(true)
    setSearchError('')
    const result = await geocodePlaces(query.trim(), mode)
    setRemote(result.results)
    setSearchError(result.error || (result.results.length ? '' : 'No map results. Try the sample directory.'))
    setSearching(false)
  }

  function next() {
    setError('')
    if (step === 0 && !mode) return setError('Choose train or bus.')
    if (step === 1 && originLabel.trim().length < 2) return setError('Enter a starting place name.')
    if (step === 2 && !destination) return setError('Select a destination.')
    if (step === 3 && selected.length === 0) return setError('Keep at least one alert distance.')
    if (step === 4 && enabled) {
      if (contactName.trim().length < 2) return setError('Enter the contact name.')
      if (!isE164(contactPhone)) return setError('Enter a 10-digit Indian mobile (e.g. 9876543210) or +919876543210.')
      if (waitSeconds < 15 || waitSeconds > 600) return setError('Waiting time must be between 15 and 600 seconds.')
    }
    setStep((value) => Math.min(5, value + 1))
  }

  function start() {
    if (activeJourney) {
      setError('End the current journey before starting another.')
      return
    }
    if (!mode || !destination) return
    saveJourney({
      id: crypto.randomUUID(),
      mode,
      originLabel: originLabel.trim(),
      origin,
      destination,
      thresholds: [...selected]
        .sort((a, b) => b - a)
        .map((meters) => ({ id: crypto.randomUUID(), meters, enabled: true })),
      emergency: {
        contactName: contactName.trim(),
        contactPhone: normalizePhone(contactPhone),
        enabled,
        waitSeconds,
      },
      status: 'active',
      startedAt: new Date().toISOString(),
      escalations: [],
      tracking: 'live',
    })
    navigate('/app/live')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="text-sm text-slate-500">Journey setup</p>
        <h1 className="text-3xl font-semibold tracking-tight">Step {step + 1} · {STEPS[step]}</h1>
      </div>
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              className={cx(
                'w-full rounded-xl px-2 py-2 text-xs font-semibold',
                index === step
                  ? 'bg-navy-900 text-white dark:bg-electric-500'
                  : index < step
                    ? 'bg-electric-50 text-electric-700 dark:bg-white/10 dark:text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-white/5',
              )}
              onClick={() => index < step && setStep(index)}
            >
              {label}
            </button>
          </li>
        ))}
      </ol>

      {activeJourney ? (
        <Banner tone="amber">A journey is already active. End it from the dashboard or live page before starting another.</Banner>
      ) : null}
      {error ? <Banner tone="rose">{error}</Banner> : null}

      {step === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {(['train', 'bus'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item)
                setDestination(null)
                setRemote([])
              }}
              className={cx(
                'rounded-2xl border p-6 text-left',
                mode === item
                  ? 'border-electric-500 bg-electric-50 dark:bg-electric-500/10'
                  : 'border-slate-200 bg-white dark:border-white/10 dark:bg-navy-800',
              )}
            >
              {item === 'train' ? <Train className="h-5 w-5" /> : <Bus className="h-5 w-5" />}
              <span className="mt-4 block text-lg font-semibold capitalize">{item}</span>
              <span className="mt-1 block text-sm text-slate-500">
                {item === 'train' ? 'Alert by distance to a station.' : 'Alert by distance to a bus stop.'}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {step === 1 ? (
        <Card className="space-y-4 p-5">
          <Field label="Starting location" hint="A name is enough. A coordinate improves the bus road estimate and the simulation start.">
            <Input value={originLabel} onChange={(event) => setOriginLabel(event.target.value)} placeholder="Where you boarded" />
          </Field>
          <Button type="button" variant="secondary" onClick={locate}>
            <LocateFixed className="h-4 w-4" /> Use my current location
          </Button>
          {origin ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Coordinate saved: {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
            </p>
          ) : null}
          {originNote ? <Banner>{originNote}</Banner> : null}
        </Card>
      ) : null}

      {step === 2 && mode ? (
        <Card className="space-y-4 p-5">
          <Field label={mode === 'train' ? 'Search a station' : 'Search a bus stop'}>
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void search()
                  }
                }}
                placeholder="City or stop name"
              />
              <Button type="button" variant="secondary" onClick={search} disabled={searching}>
                {searching ? 'Searching…' : 'Search map'}
              </Button>
            </div>
          </Field>
          {searchError ? <Banner tone="amber">{searchError}</Banner> : null}
          <PlaceList title="Sample directory" places={samples} selectedId={destination?.id} onSelect={setDestination} />
          {remote.length ? (
            <PlaceList title="OpenStreetMap search" places={remote} selectedId={destination?.id} onSelect={setDestination} />
          ) : null}
          {destination ? (
            <>
              <Pill tone="blue">Selected · {destination.name}</Pill>
              <JourneyMap destination={destination} origin={origin} className="h-64" />
            </>
          ) : null}
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="space-y-4 p-5">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Each selected distance fires once. Repeated GPS updates do not repeat the same threshold.
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((meters) => (
              <button
                key={meters}
                type="button"
                onClick={() => toggleDistance(meters)}
                className={cx(
                  'rounded-full px-3 py-1.5 text-sm font-semibold',
                  selected.includes(meters)
                    ? 'bg-navy-900 text-white dark:bg-electric-500'
                    : 'bg-slate-100 text-slate-600 dark:bg-white/10',
                )}
              >
                {formatDistance(meters)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              inputMode="numeric"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder="Custom metres"
            />
            <Button type="button" variant="secondary" onClick={addCustom}>
              Add
            </Button>
          </div>
          {selected.filter((meters) => !PRESETS.includes(meters)).length ? (
            <div className="flex flex-wrap gap-2">
              {selected
                .filter((meters) => !PRESETS.includes(meters))
                .map((meters) => (
                  <button key={meters} type="button" className="text-sm font-medium text-electric-600" onClick={() => toggleDistance(meters)}>
                    {formatDistance(meters)} · remove
                  </button>
                ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      {step === 4 ? (
        <Card className="space-y-4 p-5">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
            Enable emergency notification if there is no response
          </label>
          <Field label="Contact name">
            <Input value={contactName} onChange={(event) => setContactName(event.target.value)} />
          </Field>
          <Field label="Mobile number" hint="Enter a 10-digit Indian number (e.g. 9876543210) or full international format (+91...).">
            <Input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="+919876543210 or 9876543210" />
          </Field>
          <Field label="No-response waiting time (seconds)">
            <Input
              type="number"
              min={15}
              max={600}
              value={waitSeconds}
              onChange={(event) => setWaitSeconds(Number(event.target.value))}
            />
          </Field>
        </Card>
      ) : null}

      {step === 5 && mode && destination ? (
        <Card className="space-y-3 p-5 text-sm leading-6">
          <Row label="Transport" value={mode} />
          <Row label="Start" value={origin ? `${originLabel} · coordinates saved` : originLabel} />
          <Row label="Destination" value={`${destination.name} · ${destination.source === 'sample' ? 'sample directory' : 'map search'}`} />
          <Row label="Alerts" value={[...selected].sort((a, b) => b - a).map(formatDistance).join(', ')} />
          <Row
            label="Emergency"
            value={
              enabled
                ? `${contactName} · ${contactPhone} · ${waitSeconds}s after the alarm`
                : 'Disabled for this journey'
            }
          />
          <JourneyMap destination={destination} origin={origin} thresholds={selected} className="h-64" />
          <Button type="button" onClick={start} disabled={Boolean(activeJourney)}>
            Start journey
          </Button>
        </Card>
      ) : null}

      <div className="flex justify-between">
        <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
          Back
        </Button>
        {step < 5 ? (
          <Button type="button" onClick={next}>
            Continue
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-slate-500">{label}. </span>
      <span className="font-medium capitalize">{value}</span>
    </p>
  )
}

function PlaceList({
  title,
  places,
  selectedId,
  onSelect,
}: {
  title: string
  places: Place[]
  selectedId?: string
  onSelect: (place: Place) => void
}) {
  if (!places.length) return null
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="max-h-64 space-y-2 overflow-auto">
        {places.map((place) => (
          <li key={place.id}>
            <button
              type="button"
              onClick={() => onSelect(place)}
              className={cx(
                'w-full rounded-xl border px-3 py-2 text-left',
                selectedId === place.id
                  ? 'border-electric-500 bg-electric-50 dark:bg-electric-500/10'
                  : 'border-slate-200 dark:border-white/10',
              )}
            >
              <span className="block text-sm font-semibold">{place.name}</span>
              <span className="block text-xs text-slate-500">{place.detail}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
