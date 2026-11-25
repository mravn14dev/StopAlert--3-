import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  History,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Plus,
  Settings,
  Users,
} from 'lucide-react'
import { useApp } from '../context/AppState'
import { TrackingProvider } from '../context/Tracking'
import { cx } from '../lib/cx'
import { Logo } from './Logo'
import { AlarmOverlay } from './AlarmOverlay'
import { DeviceWarnings } from './DeviceWarnings'

const links = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/new', label: 'New journey', icon: Plus, end: false },
  { to: '/app/live', label: 'Live', icon: MapPinned, end: false },
  { to: '/app/contacts', label: 'Contacts', icon: Users, end: false },
  { to: '/app/history', label: 'History', icon: History, end: false },
  { to: '/app/settings', label: 'Settings', icon: Settings, end: false },
]

function smsLabel(mode: 'simulated' | 'twilio' | 'whatsapp' | 'offline') {
  if (mode === 'whatsapp') return 'WhatsApp API configured'
  if (mode === 'twilio') return 'SMS provider configured'
  if (mode === 'offline') return 'Notification API offline'
  return 'SMS demo mode'
}

export function AppShell() {
  const { user, logout, smsMode, activeJourney } = useApp()
  const navigate = useNavigate()

  return (
    <TrackingProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-navy-950">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-navy-900/90">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
            <button type="button" onClick={() => navigate('/app')} className="rounded-lg">
              <Logo />
            </button>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-flex dark:bg-white/10 dark:text-slate-300">
                <Bell className="h-3.5 w-3.5" />
                {smsLabel(smsMode)}
              </span>
              <span className="hidden text-sm text-slate-600 md:inline dark:text-slate-300">{user?.name}</span>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                onClick={() => {
                  logout()
                  navigate('/')
                }}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
          <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-3" aria-label="App">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cx(
                    'inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium',
                    isActive
                      ? 'bg-navy-900 text-white dark:bg-electric-500'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5',
                  )
                }
              >
                <link.icon className="h-4 w-4" />
                {link.label}
                {link.to === '/app/live' && activeJourney ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                ) : null}
              </NavLink>
            ))}
          </nav>
        </header>
        <DeviceWarnings />
        <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <Outlet />
        </main>
        <AlarmOverlay />
      </div>
    </TrackingProvider>
  )
}
