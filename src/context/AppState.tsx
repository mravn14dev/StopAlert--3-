import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Contact, Journey, PublicUser, Settings, ThemeMode } from '../types'
import {
  DEFAULT_SETTINGS,
  hashPassword,
  initStorage,
  loadContacts,
  loadJourneys,
  loadSession,
  loadSettings,
  loadTheme,
  loadUsers,
  resetDemoData,
  saveContacts,
  saveJourneys,
  saveSession,
  saveSettings,
  saveTheme,
  saveUsers,
} from '../lib/storage'
import { isEmail, normalizePhone } from '../lib/validate'

type SignupInput = {
  name: string
  email: string
  phone: string
  password: string
}

type AppContextValue = {
  ready: boolean
  user: PublicUser | null
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  contacts: Contact[]
  saveContact: (contact: Contact) => void
  deleteContact: (id: string) => void
  journeys: Journey[]
  activeJourney: Journey | null
  saveJourney: (journey: Journey) => void
  smsMode: 'simulated' | 'twilio' | 'whatsapp' | 'offline'
  refreshSmsMode: () => void
  signup: (input: SignupInput) => Promise<string | null>
  login: (email: string, password: string) => Promise<string | null>
  logout: () => void
  updateProfile: (patch: { name: string; phone: string }) => string | null
  changePassword: (current: string, next: string) => Promise<string | null>
  resetData: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

function toPublic(user: { id: string; name: string; email: string; phone: string; createdAt: string }): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    createdAt: user.createdAt,
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<PublicUser | null>(null)
  const [theme, setThemeState] = useState<ThemeMode>('system')
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [smsMode, setSmsMode] = useState<'simulated' | 'twilio' | 'whatsapp' | 'offline'>('simulated')

  const refreshSmsMode = useCallback(() => {
    fetch('/api/health')
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { sms?: string }) => {
        setSmsMode(data.sms === 'whatsapp' ? 'whatsapp' : data.sms === 'twilio' ? 'twilio' : 'simulated')
      })
      .catch(() => setSmsMode('offline'))
  }, [])

  const hydrate = useCallback((userId: string) => {
    setContacts(loadContacts(userId))
    setJourneys(loadJourneys(userId))
    setSettings(loadSettings(userId))
  }, [])

  useEffect(() => {
    let cancel = false
    initStorage().then(() => {
      if (cancel) return
      setThemeState(loadTheme())
      const session = loadSession()
      if (session) {
        const found = loadUsers().find((item) => item.id === session.userId)
        if (found) {
          setUser(toPublic(found))
          hydrate(found.id)
        } else {
          saveSession(null)
        }
      }
      setReady(true)
      refreshSmsMode()
    })
    return () => {
      cancel = true
    }
  }, [hydrate, refreshSmsMode])

  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const dark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      root.classList.toggle('dark', dark)
      root.style.colorScheme = dark ? 'dark' : 'light'
    }
    apply()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next)
    saveTheme(next)
  }, [])

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      if (!user) return
      setSettings((current) => {
        const next = { ...current, ...patch }
        saveSettings(user.id, next)
        return next
      })
    },
    [user],
  )

  const saveContact = useCallback(
    (contact: Contact) => {
      if (!user) return
      setContacts((current) => {
        const others = current.filter((item) => item.id !== contact.id)
        const next = contact.primary
          ? [...others.map((item) => ({ ...item, primary: false })), contact]
          : [...others, contact]
        if (!next.some((item) => item.primary) && next[0]) next[0] = { ...next[0], primary: true }
        saveContacts(user.id, next)
        return next
      })
    },
    [user],
  )

  const deleteContact = useCallback(
    (id: string) => {
      if (!user) return
      setContacts((current) => {
        const next = current.filter((item) => item.id !== id)
        if (next.length && !next.some((item) => item.primary)) next[0] = { ...next[0], primary: true }
        saveContacts(user.id, next)
        return next
      })
    },
    [user],
  )

  const saveJourney = useCallback(
    (journey: Journey) => {
      if (!user) return
      setJourneys((current) => {
        const index = current.findIndex((item) => item.id === journey.id)
        const next = [...current]
        if (index >= 0) next[index] = journey
        else next.unshift(journey)
        saveJourneys(user.id, next)
        return next
      })
    },
    [user],
  )

  const signup = useCallback(
    async (input: SignupInput) => {
      const name = input.name.trim()
      const email = input.email.trim().toLowerCase()
      const phone = normalizePhone(input.phone)
      if (name.length < 2) return 'Enter your name.'
      if (!isEmail(email)) return 'Enter a valid email address.'
      if (input.password.length < 8) return 'Use at least 8 characters for the password.'
      const users = loadUsers()
      if (users.some((item) => item.email === email)) return 'An account with that email already exists in this browser.'
      const account = {
        id: crypto.randomUUID(),
        name,
        email,
        phone,
        createdAt: new Date().toISOString(),
        passwordHash: await hashPassword(input.password),
      }
      saveUsers([...users, account])
      saveContacts(account.id, [])
      saveJourneys(account.id, [])
      saveSettings(account.id, DEFAULT_SETTINGS)
      saveSession(account.id)
      setUser(toPublic(account))
      hydrate(account.id)
      return null
    },
    [hydrate],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      const normalized = email.trim().toLowerCase()
      const found = loadUsers().find((item) => item.email === normalized)
      if (!found) return 'No account with that email exists in this browser.'
      const hash = await hashPassword(password)
      if (hash !== found.passwordHash) return 'That password does not match.'
      saveSession(found.id)
      setUser(toPublic(found))
      hydrate(found.id)
      return null
    },
    [hydrate],
  )

  const logout = useCallback(() => {
    saveSession(null)
    setUser(null)
    setContacts([])
    setJourneys([])
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const updateProfile = useCallback(
    (patch: { name: string; phone: string }) => {
      if (!user) return 'You are signed out.'
      const name = patch.name.trim()
      if (name.length < 2) return 'Enter your name.'
      const phone = normalizePhone(patch.phone)
      const users = loadUsers().map((item) => (item.id === user.id ? { ...item, name, phone } : item))
      saveUsers(users)
      setUser({ ...user, name, phone })
      return null
    },
    [user],
  )

  const changePassword = useCallback(
    async (current: string, next: string) => {
      if (!user) return 'You are signed out.'
      if (next.length < 8) return 'Use at least 8 characters for the new password.'
      const users = loadUsers()
      const found = users.find((item) => item.id === user.id)
      if (!found) return 'Account not found in this browser.'
      const currentHash = await hashPassword(current)
      if (currentHash !== found.passwordHash) return 'The current password does not match.'
      found.passwordHash = await hashPassword(next)
      saveUsers(users)
      return null
    },
    [user],
  )

  const resetData = useCallback(async () => {
    await resetDemoData()
    saveSession(null)
    setUser(null)
    setContacts([])
    setJourneys([])
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const activeJourney = useMemo(
    () => journeys.find((journey) => journey.status === 'active') ?? null,
    [journeys],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      user,
      theme,
      setTheme,
      settings,
      updateSettings,
      contacts,
      saveContact,
      deleteContact,
      journeys,
      activeJourney,
      saveJourney,
      smsMode,
      refreshSmsMode,
      signup,
      login,
      logout,
      updateProfile,
      changePassword,
      resetData,
    }),
    [
      ready,
      user,
      theme,
      setTheme,
      settings,
      updateSettings,
      contacts,
      saveContact,
      deleteContact,
      journeys,
      activeJourney,
      saveJourney,
      smsMode,
      refreshSmsMode,
      signup,
      login,
      logout,
      updateProfile,
      changePassword,
      resetData,
    ],
  )

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-white text-slate-600 dark:bg-navy-950 dark:text-slate-300">
        <p className="text-sm font-medium">Loading StopAlert…</p>
      </div>
    )
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
