import { Link } from 'react-router-dom'
import { ArrowRight, Bus, MapPin, Shield, Train } from 'lucide-react'
import { JourneyMap } from '../components/JourneyMap'
import { Banner, Card, Pill, buttonClass } from '../components/ui'
import { useApp } from '../context/AppState'
import { useTracking } from '../context/Tracking'
import { SAMPLE_PLACES, toPlace } from '../lib/catalog'
import { accuracyWord, formatDistance } from '../lib/geo'
import { useTitle } from '../hooks/useDeviceStatus'

function when(iso: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

const gpsCopy: Record<string, string> = {
  idle: 'Waiting to track',
  requesting: 'Requesting location',
  tracking: 'Live GPS',
  'poor-accuracy': 'Fix too coarse',
  denied: 'Permission denied',
  unavailable: 'Location unavailable',
  simulated: 'Presentation simulation',
  'jump-ignored': 'Jump ignored',
}

export function DashboardPage() {
  const { user, activeJourney, journeys, contacts, smsMode, saveJourney } = useApp()
  const tracker = useTracking()
  useTitle('Dashboard')
  const recent = journeys.slice(0, 4)
  const primary = contacts.find((contact) => contact.primary) || contacts[0]
  const previewDest = activeJourney?.destination || journeys[0]?.destination || toPlace(SAMPLE_PLACES[2])
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-slate-500">Welcome</p>
          <h1 className="text-3xl font-semibold tracking-tight">{user?.name}</h1>
        </div>
        <Link to="/app/new" className={buttonClass('primary')}>
          Start New Journey <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {tracker.gpsStatus === 'denied' ? (
        <Banner tone="rose">{tracker.gpsError} You can still run the presentation simulation from Live tracking.</Banner>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Current journey</p>
              <h2 className="mt-1 text-xl font-semibold">
                {activeJourney ? activeJourney.destination.name : 'No journey in progress'}
              </h2>
            </div>
            {activeJourney ? (
              <Pill tone={tracker.gpsStatus === 'tracking' ? 'green' : tracker.gpsStatus === 'simulated' ? 'amber' : 'blue'}>
                {gpsCopy[tracker.gpsStatus] || tracker.gpsStatus}
              </Pill>
            ) : (
              <Pill>Idle</Pill>
            )}
          </div>
          {activeJourney ? (
            <>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Transport</dt>
                  <dd className="mt-1 inline-flex items-center gap-2 font-medium capitalize">
                    {activeJourney.mode === 'train' ? <Train className="h-4 w-4" /> : <Bus className="h-4 w-4" />}
                    {activeJourney.mode}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Destination</dt>
                  <dd className="mt-1 font-medium">{activeJourney.destination.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Distance remaining</dt>
                  <dd className="mt-1 text-2xl font-semibold tracking-tight">
                    {tracker.distanceM == null ? '—' : formatDistance(tracker.distanceM)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">GPS accuracy</dt>
                  <dd className="mt-1 font-medium">
                    {tracker.accuracy == null ? 'Not a GPS fix' : `${accuracyWord(tracker.accuracy)} · ${Math.round(tracker.accuracy)} m`}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/app/live" className={buttonClass('primary')}>
                  Open live tracking
                </Link>
                <button
                  type="button"
                  className={buttonClass('secondary')}
                  onClick={() =>
                    saveJourney({ ...activeJourney, status: 'cancelled', endedAt: new Date().toISOString() })
                  }
                >
                  End journey
                </button>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Start a journey to watch distance to a station or bus stop.
            </p>
          )}
        </Card>
        <div className="grid gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Shield className="h-4 w-4" /> Emergency contact
            </div>
            {primary ? (
              <>
                <p className="mt-2 font-semibold">{primary.name}</p>
                <p className="text-sm text-slate-500">{primary.phone}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {smsMode === 'whatsapp'
                    ? 'WhatsApp API credentials are configured on the server. Delivery is only claimed when confirmed.'
                    : smsMode === 'twilio'
                      ? 'The server has SMS credentials. Delivery is still only claimed when the provider confirms it.'
                      : smsMode === 'offline'
                        ? 'The notification API is offline, so a message cannot be sent automatically.'
                        : 'Demo mode simulates automatic sending. Use WhatsApp or Call actions directly anytime.'}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                No contact yet. <Link className="font-semibold text-electric-600" to="/app/contacts">Add one</Link>
              </p>
            )}
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <MapPin className="h-4 w-4" /> Tracking note
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              GPS continues while you move around this app. Closing the browser or locking the phone pauses it.
            </p>
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{activeJourney ? 'Live route map' : 'Destination map'}</h2>
            <p className="text-xs text-slate-500">
              {activeJourney
                ? `Tracking distance to ${activeJourney.destination.name}`
                : `Previewing ${previewDest.name} · start a journey to track live`}
            </p>
          </div>
          <Pill tone={activeJourney ? 'green' : 'neutral'}>{activeJourney ? 'Active' : 'Preview'}</Pill>
        </div>
        <JourneyMap
          destination={previewDest}
          origin={activeJourney?.origin}
          position={activeJourney ? tracker.position : null}
          roadLine={activeJourney ? tracker.roadLine : null}
          thresholds={
            activeJourney
              ? activeJourney.thresholds.filter((item) => item.enabled).map((item) => item.meters)
              : [2000, 500]
          }
          className="h-[380px]"
        />
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent journeys</h2>
          <Link to="/app/history" className="text-sm font-semibold text-electric-600">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No journeys stored on this device yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/10">
            {recent.map((journey) => (
              <li key={journey.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{journey.destination.name}</p>
                  <p className="text-xs text-slate-500">
                    {journey.mode} · {when(journey.startedAt)}
                    {journey.tracking === 'sample' ? ' · sample history' : ''}
                  </p>
                </div>
                <Pill tone={journey.status === 'active' ? 'green' : journey.status === 'completed' ? 'blue' : 'neutral'}>
                  {journey.status}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
