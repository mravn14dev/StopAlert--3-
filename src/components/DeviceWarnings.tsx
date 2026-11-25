import { BatteryWarning, WifiOff } from 'lucide-react'
import { useDeviceStatus } from '../hooks/useDeviceStatus'

export function DeviceWarnings() {
  const { online, battery, batterySupported } = useDeviceStatus()
  const low = batterySupported && battery && battery.level < 0.2 && !battery.charging
  if (online && !low) return null
  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-2 text-sm sm:flex-row sm:gap-6">
        {!online ? (
          <p className="inline-flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            You are offline. Saved journey details stay on this device. Place search and SMS need a connection.
          </p>
        ) : null}
        {low && battery ? (
          <p className="inline-flex items-center gap-2">
            <BatteryWarning className="h-4 w-4" />
            Battery is about {Math.round(battery.level * 100)}%. Keep the screen available so location updates continue.
          </p>
        ) : null}
      </div>
    </div>
  )
}
