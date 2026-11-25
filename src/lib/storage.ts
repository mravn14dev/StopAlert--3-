import type { Contact, Journey, Place, Settings, StoredUser, ThemeMode } from '../types'
import { SAMPLE_PLACES } from './catalog'

const USERS = 'stopalert.users.v1'
const SESSION = 'stopalert.session.v1'
const THEME = 'stopalert.theme.v1'

const contactsKey = (id: string) => `stopalert.contacts.v1.${id}`
const journeysKey = (id: string) => `stopalert.journeys.v1.${id}`
const settingsKey = (id: string) => `stopalert.settings.v1.${id}`

export const DEMO_EMAIL = 'demo@stopalert.app'
export const DEMO_PASSWORD = 'demo12345'

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  vibration: true,
  browserNotifications: false,
  defaultThresholds: [10000, 5000, 2000, 500],
  defaultWaitSeconds: 60,
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export async function hashPassword(password: string) {
  const data = new TextEncoder().encode(`stopalert-demo-v1:${password}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function samplePlace(id: string): Place {
  const found = SAMPLE_PLACES.find((place) => place.id === id)
  if (!found) throw new Error('Missing sample place')
  return {
    id: found.id,
    name: found.name,
    detail: found.detail,
    lat: found.lat,
    lng: found.lng,
    kind: found.kind,
    source: 'sample',
  }
}

async function seedIfEmpty() {
  const users = read<StoredUser[]>(USERS, [])
  if (users.length > 0) return
  const now = new Date()
  const yesterday = new Date(now.getTime() - 26 * 60 * 60 * 1000)
  const user: StoredUser = {
    id: 'user_demo',
    name: 'Demo Passenger',
    email: DEMO_EMAIL,
    phone: '+12125550198',
    createdAt: yesterday.toISOString(),
    passwordHash: await hashPassword(DEMO_PASSWORD),
  }
  const contact: Contact = {
    id: 'contact_demo',
    name: 'Demo Contact',
    phone: '+12125550100',
    relationship: 'Fictional number for the demo',
    primary: true,
  }
  const completed: Journey = {
    id: 'journey_sample_completed',
    mode: 'train',
    originLabel: 'Sample origin · not a tracked trip',
    destination: samplePlace('mas'),
    thresholds: [
      { id: 't1', meters: 10000, enabled: true, firedAt: yesterday.toISOString() },
      { id: 't2', meters: 2000, enabled: true, firedAt: yesterday.toISOString() },
    ],
    emergency: {
      contactName: contact.name,
      contactPhone: contact.phone,
      enabled: true,
      waitSeconds: 60,
    },
    status: 'completed',
    startedAt: yesterday.toISOString(),
    endedAt: new Date(yesterday.getTime() + 3 * 60 * 60 * 1000).toISOString(),
    acknowledgedAt: yesterday.toISOString(),
    initialDistanceM: 12000,
    lastPosition: {
      lat: 13.084,
      lng: 80.276,
      accuracy: 25,
      at: yesterday.toISOString(),
      source: 'gps',
    },
    escalations: [],
    tracking: 'sample',
    note: 'Sample history stored in this browser for the demo account. This trip was not tracked live.',
  }
  const cancelled: Journey = {
    id: 'journey_sample_cancelled',
    mode: 'bus',
    originLabel: 'Sample origin · not a tracked trip',
    destination: samplePlace('cmbt'),
    thresholds: [{ id: 't3', meters: 5000, enabled: true }],
    emergency: {
      contactName: contact.name,
      contactPhone: contact.phone,
      enabled: false,
      waitSeconds: 90,
    },
    status: 'cancelled',
    startedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
    endedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    escalations: [],
    tracking: 'sample',
    note: 'Sample history. No alert fired and no message was sent.',
  }
  write(USERS, [user])
  write(contactsKey(user.id), [contact])
  write(journeysKey(user.id), [completed, cancelled])
  write(settingsKey(user.id), DEFAULT_SETTINGS)
}

export async function initStorage() {
  await seedIfEmpty()
}

export function loadUsers() {
  return read<StoredUser[]>(USERS, [])
}

export function saveUsers(users: StoredUser[]) {
  write(USERS, users)
}

export function loadSession() {
  return read<{ userId: string } | null>(SESSION, null)
}

export function saveSession(userId: string | null) {
  if (!userId) localStorage.removeItem(SESSION)
  else write(SESSION, { userId })
}

export function loadTheme(): ThemeMode {
  const value = localStorage.getItem(THEME)
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}

export function saveTheme(theme: ThemeMode) {
  localStorage.setItem(THEME, theme)
}

export function loadSettings(userId: string): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(settingsKey(userId), {}) }
}

export function saveSettings(userId: string, settings: Settings) {
  write(settingsKey(userId), settings)
}

export function loadContacts(userId: string) {
  return read<Contact[]>(contactsKey(userId), [])
}

export function saveContacts(userId: string, contacts: Contact[]) {
  write(contactsKey(userId), contacts)
}

export function loadJourneys(userId: string) {
  return read<Journey[]>(journeysKey(userId), [])
}

export function saveJourneys(userId: string, journeys: Journey[]) {
  write(journeysKey(userId), journeys)
}

export async function resetDemoData() {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith('stopalert.') && key !== THEME) keys.push(key)
  }
  keys.forEach((key) => localStorage.removeItem(key))
  await seedIfEmpty()
}
