import { BellRing, MessageCircle, Phone, ShieldAlert } from 'lucide-react'
import { motion } from 'framer-motion'
import { countdownLabel, formatDistance, mapsLink } from '../lib/geo'
import { whatsappLink } from '../lib/validate'
import { useApp } from '../context/AppState'
import { useTracking } from '../context/Tracking'
import { Button } from './ui'

export function AlarmOverlay() {
  const { activeJourney, user } = useApp()
  const tracker = useTracking()
  if (!activeJourney || tracker.alarmMeters == null || activeJourney.acknowledgedAt) return null

  const latest = activeJourney.escalations[activeJourney.escalations.length - 1]
  const phone = activeJourney.emergency.contactPhone
  const waText =
    latest?.preview ||
    `StopAlert: ${user?.name || 'A passenger'} is approaching ${activeJourney.destination.name} (${tracker.distanceM != null ? formatDistance(tracker.distanceM) : 'near destination'}).${activeJourney.lastPosition ? ` Last location: ${mapsLink(activeJourney.lastPosition.lat, activeJourney.lastPosition.lng)}` : ''}`
  const waUrl = phone ? whatsappLink(phone, waText) : ''

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-navy-950/80 p-4 backdrop-blur-sm sm:items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-navy-900 text-white shadow-2xl"
      >
        <div className="absolute left-1/2 top-10 h-40 w-40 -translate-x-1/2 rounded-full bg-electric-500/30 alert-ping" />
        <div className="relative px-6 pb-6 pt-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-electric-500">
            <BellRing className="h-8 w-8" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-electric-100">Distance alert</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Wake up — your stop is close</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            You are inside the {formatDistance(tracker.alarmMeters)} threshold for {activeJourney.destination.name}.
            This alarm is based on location, not a clock.
          </p>
          <p className="mt-4 text-4xl font-semibold tracking-tight text-white">
            {tracker.distanceM == null ? '—' : formatDistance(tracker.distanceM)}
            <span className="ml-2 text-base font-medium text-slate-400">remaining</span>
          </p>
          {tracker.countdownMs != null ? (
            <p className="mt-4 rounded-xl bg-white/5 px-3 py-2 text-sm text-amber-100">
              Contact countdown {countdownLabel(tracker.countdownMs)}. Acknowledging cancels it. Silencing the sound does not.
            </p>
          ) : null}
          {latest ? (
            <p className="mt-3 text-left text-sm leading-6 text-slate-300">
              <ShieldAlert className="mr-1 inline h-4 w-4" />
              {latest.mode === 'simulated'
                ? `Simulated only. ${latest.detail}`
                : latest.mode === 'twilio'
                  ? latest.detail
                  : latest.detail}
            </p>
          ) : null}
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button onClick={tracker.acknowledge}>I&apos;m awake</Button>
            {tracker.silenced ? (
              <Button variant="secondary" onClick={tracker.resumeSound}>
                Resume sound
              </Button>
            ) : (
              <Button variant="secondary" onClick={tracker.silence}>
                Stop alarm
              </Button>
            )}
          </div>
          {phone ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
              <a
                className="inline-flex items-center gap-2 text-sm font-semibold text-electric-100"
                href={`tel:${phone}`}
              >
                <Phone className="h-4 w-4" /> Call {activeJourney.emergency.contactName || 'emergency contact'}
              </a>
              {waUrl ? (
                <a
                  className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300"
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> Message on WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}
          {activeJourney.lastPosition ? (
            <a
              className="mt-2 block text-xs text-slate-400 underline"
              href={mapsLink(activeJourney.lastPosition.lat, activeJourney.lastPosition.lng)}
              target="_blank"
              rel="noreferrer"
            >
              Last known location
            </a>
          ) : null}
        </div>
      </motion.div>
    </div>
  )
}
