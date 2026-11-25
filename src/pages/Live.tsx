import { Link } from 'react-router-dom'
import { JourneyMap } from '../components/JourneyMap'
import { Banner, Button, Card, Pill, buttonClass } from '../components/ui'
import { useApp } from '../context/AppState'
import { useTracking } from '../context/Tracking'
import { accuracyWord, countdownLabel, formatDistance, formatDuration, mapsLink } from '../lib/geo'
import { whatsappLink } from '../lib/validate'
import { useTitle } from '../hooks/useDeviceStatus'

const gpsCopy: Record<string, string> = {
  idle: 'Idle',
  requesting: 'Requesting GPS',
  tracking: 'Live GPS',
  'poor-accuracy': 'Accuracy too low to use',
  denied: 'Permission denied',
  unavailable: 'Unavailable',
  simulated: 'Simulated position',
  'jump-ignored': 'Jump ignored',
}

export function LivePage() {
  const { activeJourney, saveJourney, smsMode, user } = useApp()
  const tracker = useTracking()
  useTitle('Live tracking')

  if (!activeJourney) {
    return (
      <Card className="p-8">
        <h1 className="text-2xl font-semibold">No active journey</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Start a journey to watch your distance to a station or bus stop. Alerts fire from that distance.
        </p>
        <Link to="/app/new" className={buttonClass('primary', 'mt-5')}>
          Start New Journey
        </Link>
      </Card>
    )
  }

  const journey = activeJourney
  const initial = journey.initialDistanceM
  const progress =
    initial && tracker.distanceM != null && initial > 0
      ? Math.max(0, Math.min(1, 1 - tracker.distanceM / initial))
      : 0
  const latest = journey.escalations[journey.escalations.length - 1]

  function finish(status: 'completed' | 'cancelled') {
    tracker.acknowledge()
    saveJourney({
      ...journey,
      status,
      endedAt: new Date().toISOString(),
      acknowledgedAt: journey.acknowledgedAt || new Date().toISOString(),
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm capitalize text-slate-500">{activeJourney.mode} journey</p>
          <h1 className="text-3xl font-semibold tracking-tight">{activeJourney.destination.name}</h1>
        </div>
        <Pill tone={tracker.gpsStatus === 'tracking' ? 'green' : tracker.gpsStatus === 'simulated' ? 'amber' : 'blue'}>
          {gpsCopy[tracker.gpsStatus]}
        </Pill>
      </div>

      <Banner tone="blue">
        Tracking works while this tab stays open and the device keeps the page available. Locking the phone, closing
        the browser, or the system pausing the tab stops GPS. Reliable background tracking needs a native app.
      </Banner>
      {tracker.gpsError ? <Banner tone="rose">{tracker.gpsError}</Banner> : null}
      {tracker.notice ? <Banner tone={tracker.simulated ? 'amber' : 'neutral'}>{tracker.notice}</Banner> : null}
      {smsMode === 'offline' ? (
        <Banner tone="amber">The notification API is offline. If the countdown ends, nothing will be sent.</Banner>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-4 p-5">
          <div>
            <p className="text-sm text-slate-500">Remaining straight-line distance</p>
            <p className="text-5xl font-semibold tracking-tight">
              {tracker.distanceM == null ? '—' : formatDistance(tracker.distanceM)}
            </p>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Progress from the first fix</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div className="h-full rounded-full bg-electric-500" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Accuracy</dt>
              <dd className="font-medium">
                {tracker.accuracy == null ? 'Simulation or unknown' : `${accuracyWord(tracker.accuracy)} · ${Math.round(tracker.accuracy)} m`}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Movement ETA</dt>
              <dd className="font-medium">
                {tracker.etaSeconds == null ? 'Unavailable' : formatDuration(tracker.etaSeconds)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Road estimate</dt>
              <dd className="font-medium">{tracker.roadMinutes == null ? 'None' : `${Math.round(tracker.roadMinutes)} min`}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Contact countdown</dt>
              <dd className="font-medium">
                {tracker.countdownMs == null ? 'Not running' : countdownLabel(tracker.countdownMs)}
              </dd>
            </div>
          </dl>
          <p className="text-xs leading-5 text-slate-500">{tracker.roadNote}</p>
          <div className="flex flex-wrap gap-2">
            {tracker.simulated ? (
              <Button type="button" variant="secondary" onClick={tracker.stopSimulation}>
                Stop simulation and use GPS
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={tracker.startSimulation}>
                Run presentation simulation
              </Button>
            )}
            <Button type="button" onClick={() => finish('completed')}>
              Mark arrived
            </Button>
            <Button type="button" variant="ghost" onClick={() => finish('cancelled')}>
              Cancel journey
            </Button>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            The simulation moves a pretend point toward the stop on this device. It is not GPS and not a vehicle.
          </p>
        </Card>
        <JourneyMap
          destination={activeJourney.destination}
          origin={activeJourney.origin}
          position={tracker.position}
          roadLine={tracker.roadLine}
          thresholds={activeJourney.thresholds.filter((item) => item.enabled && !item.firedAt).map((item) => item.meters)}
          className="h-[460px]"
        />
      </div>

      <Card className="p-5">
        <h2 className="font-semibold">Alert thresholds</h2>
        <ul className="mt-3 space-y-2">
          {activeJourney.thresholds.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <span>{formatDistance(item.meters)}</span>
              <Pill tone={item.firedAt ? 'green' : 'neutral'}>{item.firedAt ? 'Triggered' : 'Waiting'}</Pill>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">Emergency notification</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {activeJourney.emergency.enabled
            ? `${activeJourney.emergency.contactName} · ${activeJourney.emergency.contactPhone} · waits ${activeJourney.emergency.waitSeconds}s`
            : 'Disabled for this journey.'}
        </p>
        {tracker.escalating ? <p className="text-sm">Contacting the notification service…</p> : null}
        {latest ? <Escalation detail={latest.detail} mode={latest.mode} delivered={latest.delivered} accepted={latest.accepted} preview={latest.preview} /> : (
          <p className="text-sm text-slate-500">No notification has been attempted.</p>
        )}
        {latest && latest.mode !== 'twilio' && latest.mode !== 'whatsapp' ? (
          <Button type="button" variant="secondary" onClick={() => tracker.retryEscalation(true)}>
            Try the notification again
          </Button>
        ) : null}
        {activeJourney.lastPosition ? (
          <a className="block text-sm font-semibold text-electric-600" href={mapsLink(activeJourney.lastPosition.lat, activeJourney.lastPosition.lng)} target="_blank" rel="noreferrer">
            Open last known location
          </a>
        ) : null}
        {activeJourney.emergency.contactPhone ? (
          <div className="flex flex-wrap gap-4 pt-1">
            <a className="text-sm font-semibold text-electric-600" href={`tel:${activeJourney.emergency.contactPhone}`}>
              Call contact
            </a>
            <a
              className="text-sm font-semibold text-emerald-600 dark:text-emerald-400"
              href={whatsappLink(
                activeJourney.emergency.contactPhone,
                latest?.preview ||
                  `StopAlert: ${user?.name || 'A passenger'} is travelling to ${activeJourney.destination.name}.${activeJourney.lastPosition ? ` Last location: ${mapsLink(activeJourney.lastPosition.lat, activeJourney.lastPosition.lng)}` : ''}`,
              )}
              target="_blank"
              rel="noreferrer"
            >
              Message on WhatsApp
            </a>
          </div>
        ) : null}
      </Card>
    </div>
  )
}

function Escalation({
  mode,
  delivered,
  accepted,
  detail,
  preview,
}: {
  mode: 'simulated' | 'twilio' | 'whatsapp' | 'failed'
  delivered: boolean
  accepted: boolean
  detail: string
  preview?: string
}) {
  const label =
    mode === 'simulated'
      ? 'Simulated — not sent'
      : mode === 'failed'
        ? 'Not sent'
        : delivered
          ? 'Provider confirmed delivery'
          : accepted
            ? 'Accepted by provider — delivery not confirmed'
            : 'Provider did not accept it'
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
      <Pill tone={(mode === 'twilio' || mode === 'whatsapp') && delivered ? 'green' : mode === 'failed' ? 'rose' : 'amber'}>{label}</Pill>
      <p className="mt-2 leading-6">{detail}</p>
      {preview ? <p className="mt-2 text-xs leading-5 text-slate-500">{preview}</p> : null}
    </div>
  )
}
