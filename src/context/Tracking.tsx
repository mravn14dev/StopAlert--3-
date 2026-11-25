import { createContext, useContext, type ReactNode } from 'react'
import { useLiveTracker } from '../hooks/useLiveTracker'
import { useApp } from './AppState'

type Tracker = ReturnType<typeof useLiveTracker>

const TrackingContext = createContext<Tracker | null>(null)

export function TrackingProvider({ children }: { children: ReactNode }) {
  const { activeJourney, user, settings, saveJourney } = useApp()
  const tracker = useLiveTracker({
    journey: activeJourney,
    passengerName: user?.name || 'Passenger',
    sound: settings.sound,
    vibration: settings.vibration,
    notifications: settings.browserNotifications,
    onJourney: saveJourney,
  })
  return <TrackingContext.Provider value={tracker}>{children}</TrackingContext.Provider>
}

export function useTracking() {
  const value = useContext(TrackingContext)
  if (!value) throw new Error('useTracking must be used inside TrackingProvider')
  return value
}
