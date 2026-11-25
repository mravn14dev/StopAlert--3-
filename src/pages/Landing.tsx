import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BellRing,
  Bus,
  ChevronDown,
  MapPin,
  Menu,
  Moon,
  Shield,
  Smartphone,
  Sun,
  Train,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppState'
import { Logo } from '../components/Logo'
import { buttonClass } from '../components/ui'
import { useTitle } from '../hooks/useDeviceStatus'

const steps = [
  {
    title: 'Choose the journey',
    body: 'Pick train or bus, name where you boarded, and select the station or stop you must not miss.',
  },
  {
    title: 'Set distance alerts',
    body: 'Choose 10 km, 5 km, 2 km, 500 m, or your own distances. The alarm uses those distances, not a timer.',
  },
  {
    title: 'Keep this tab open',
    body: 'The browser reads your location while the page is open. StopAlert measures the straight-line distance to your stop.',
  },
  {
    title: 'Wake up, or escalate',
    body: 'A loud alert, notification, and vibration fire at the threshold. If you do not respond, your contact can be notified.',
  },
]

const features = [
  {
    icon: MapPin,
    title: 'Location, not a clock',
    body: 'Delays and early arrivals do not matter. Alerts fire when you cross a distance you chose.',
  },
  {
    icon: BellRing,
    title: 'An alarm you can answer',
    body: 'Repeated sound, a full-screen alert, browser notification, and vibration where the device allows it.',
  },
  {
    icon: Shield,
    title: 'A contact if you stay asleep',
    body: 'A countdown starts with the alarm. Acknowledge it and the contact is not notified.',
  },
  {
    icon: Smartphone,
    title: 'Honest about the browser',
    body: 'This web app cannot promise tracking after the tab closes or the phone locks. That needs a native app.',
  },
]

const faqs = [
  {
    q: 'Does the alarm use the clock?',
    a: 'No. Destination alerts compare your GPS position with the stop using the Haversine distance. A poor or sudden location fix is ignored so it cannot create a false alarm.',
  },
  {
    q: 'Will it track me if I lock my phone?',
    a: 'Not reliably. Browsers pause geolocation when the tab is hidden, the screen locks, or the browser is closed. For a journey, keep StopAlert open and the screen available. Reliable background tracking needs a native mobile app.',
  },
  {
    q: 'Does it know where the train or bus actually is?',
    a: 'No. StopAlert does not show live train or bus positions and does not invent official routes. It tracks the passenger. For buses, a road line may appear from a public routing service and is labeled as an estimate.',
  },
  {
    q: 'Is the emergency text a real SMS?',
    a: 'Only when a server administrator has configured an SMS provider. Otherwise the app shows a simulated preview and states that nothing was sent. A simulated message is never described as delivered.',
  },
  {
    q: 'Where is my account stored?',
    a: 'This demonstration keeps accounts, contacts, and journey history in this browser. It is not a cloud login. Clearing site data removes it. A demo account is created automatically.',
  },
]

export function LandingPage() {
  const { user, theme, setTheme } = useApp()
  const [open, setOpen] = useState(false)
  const [faq, setFaq] = useState<number | null>(0)
  useTitle('StopAlert')
  const start = user ? '/app/new' : '/signup'

  return (
    <div className="min-h-screen bg-white dark:bg-navy-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-navy-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex dark:text-slate-300">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#modes">Train and bus</a>
            <a href="#emergency">Emergency</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
              aria-label="Toggle color theme"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user ? (
              <Link to="/app" className={buttonClass('primary')}>
                Open dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className={buttonClass('ghost')}>
                  Log in
                </Link>
                <Link to="/signup" className={buttonClass('primary')}>
                  Start Your Journey
                </Link>
              </>
            )}
          </div>
          <button type="button" className="rounded-xl p-2 md:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open ? (
          <div className="space-y-2 border-t border-slate-200 px-4 py-3 md:hidden dark:border-white/10">
            <a className="block py-2 text-sm" href="#how" onClick={() => setOpen(false)}>
              How it works
            </a>
            <a className="block py-2 text-sm" href="#features" onClick={() => setOpen(false)}>
              Features
            </a>
            <a className="block py-2 text-sm" href="#modes" onClick={() => setOpen(false)}>
              Train and bus
            </a>
            <a className="block py-2 text-sm" href="#emergency" onClick={() => setOpen(false)}>
              Emergency
            </a>
            <a className="block py-2 text-sm" href="#faq" onClick={() => setOpen(false)}>
              FAQ
            </a>
            <Link to={user ? '/app' : '/login'} className={buttonClass('secondary', 'w-full')} onClick={() => setOpen(false)}>
              {user ? 'Dashboard' : 'Log in'}
            </Link>
            {!user ? (
              <Link to="/signup" className={buttonClass('primary', 'w-full')} onClick={() => setOpen(false)}>
                Start Your Journey
              </Link>
            ) : null}
          </div>
        ) : null}
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-electric-600">Train and bus</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-navy-900 sm:text-5xl dark:text-white">
              Never Miss Your Stop Again.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Smart location-based alerts that wake you before your destination.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={start} className={buttonClass('primary', 'px-5 py-3')}>
                Start Your Journey
              </Link>
              <a href="#features" className={buttonClass('secondary', 'px-5 py-3')}>
                Explore Features
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Demo accounts stay in this browser. Alerts follow GPS distance while the tab stays open.
            </p>
          </div>
          <HeroCard />
        </section>

        <section id="how" className="border-y border-slate-200 bg-slate-50 py-16 dark:border-white/10 dark:bg-navy-900">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
            <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
              Four steps from a sleeping passenger to a distance alarm you can acknowledge.
            </p>
            <ol className="mt-8 grid gap-4 md:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-white/10 dark:bg-navy-800">
                  <span className="text-sm font-semibold text-electric-600">0{index + 1}</span>
                  <h3 className="mt-3 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">Built for the moment you drift off</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-slate-200 p-6 dark:border-white/10">
                <feature.icon className="h-5 w-5 text-electric-600" />
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="modes" className="bg-navy-900 py-16 text-white">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <Train className="h-5 w-5 text-electric-400" />
              <h2 className="mt-4 text-2xl font-semibold">Train</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Search a sample station directory or the map. The blue line is straight-line distance to that station.
                It is not a timetable, a live train, or an official rail path.
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <Bus className="h-5 w-5 text-electric-400" />
              <h2 className="mt-4 text-2xl font-semibold">Bus</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Choose a bus stop the same way. If a start coordinate exists, StopAlert may request a road-routing
                estimate. That line is not an official bus route and not a live bus.
              </p>
            </article>
          </div>
        </section>

        <section id="emergency" className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Someone else can be told — only if you do not answer</h2>
              <ol className="mt-6 space-y-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <li>1. The passenger alarm starts when a distance threshold is crossed.</li>
                <li>2. A countdown you chose begins at the same moment.</li>
                <li>3. Tap “I’m awake” and the countdown is cancelled.</li>
                <li>4. If the countdown ends, the server prepares a message for the contact.</li>
                <li>5. The message includes your name, destination, remaining distance, an arrival note when movement allows one, and a map link.</li>
              </ol>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-navy-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Message preview</p>
              <p className="mt-3 text-sm leading-6">
                StopAlert: Demo Passenger has not responded near Chennai Central. About 1.8 km remaining. Estimated
                arrival is unavailable. Last location: openstreetmap.org
              </p>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Without SMS credentials this stays a preview. The product never marks a text as delivered unless the
                provider says so.
              </p>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-16 dark:border-white/10 dark:bg-navy-900">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-semibold tracking-tight">What you can rely on</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              These are product behaviors, not usage statistics.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ['Distance stays the trigger', 'A late train does not make a time alarm early, and an early bus does not make it late.'],
                ['False jumps are dropped', 'A fix that implies an impossible speed, or one too inaccurate for the threshold, does not fire the alarm.'],
                ['History stays on device', 'Journey details are saved locally, so you can still read the destination if the connection drops.'],
              ].map(([title, body]) => (
                <article key={title} className="rounded-2xl bg-white p-5 shadow-card dark:bg-navy-800">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">Questions</h2>
          <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200 dark:divide-white/10 dark:border-white/10">
            {faqs.map((item, index) => {
              const expanded = faq === index
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 py-4 text-left font-medium"
                    aria-expanded={expanded}
                    onClick={() => setFaq(expanded ? null : index)}
                  >
                    {item.q}
                    <ChevronDown className={`h-4 w-4 shrink-0 transition ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                  {expanded ? <p className="pb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.a}</p> : null}
                </div>
              )
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-navy-900 text-slate-300 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
          <div>
            <Logo light />
            <p className="mt-3 max-w-sm text-sm leading-6">
              A location-based travel alert for passengers who fall asleep. University demonstration build.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-2">
              <p className="font-semibold text-white">Product</p>
              <a className="block" href="#how">How it works</a>
              <a className="block" href="#features">Features</a>
              <Link className="block" to="/signup">Create account</Link>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-white">Limits</p>
              <p>Foreground GPS only</p>
              <p>No live vehicle positions</p>
              <p>SMS only with server credentials</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function HeroCard() {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-electric-100 to-transparent blur-2xl dark:from-electric-500/20" />
      <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-card dark:border-white/10 dark:bg-navy-800">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-xs font-medium text-slate-500 dark:border-white/10">
          <span>Live distance</span>
          <span className="text-emerald-600">Tracking</span>
        </div>
        <div className="relative h-64 bg-[radial-gradient(circle_at_30%_40%,#dbe6ff,transparent_42%),linear-gradient(#e8eef8,#f8fafc)] dark:bg-[radial-gradient(circle_at_30%_40%,rgba(47,107,255,.35),transparent_42%),linear-gradient(#121c33,#0b1220)]">
          <svg viewBox="0 0 420 260" className="h-full w-full" role="img" aria-label="Map illustration with a route to a destination">
            <path d="M40 190 C 110 170, 140 90, 210 110 S 320 80, 360 48" fill="none" stroke="#2f6bff" strokeWidth="4" strokeLinecap="round" />
            <circle cx="40" cy="190" r="7" fill="#64748b" />
            <circle cx="360" cy="48" r="8" fill="#0b1220" stroke="#fff" strokeWidth="3" />
            <circle cx="248" cy="96" r="8" fill="#2f6bff" stroke="#fff" strokeWidth="3" />
          </svg>
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-card backdrop-blur dark:border-white/10 dark:bg-navy-900/90">
            <p className="text-xs font-medium text-slate-500">Chennai Central</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">2.0 km</p>
            <p className="text-xs text-slate-500">Next alert at 2 km · straight-line distance</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
