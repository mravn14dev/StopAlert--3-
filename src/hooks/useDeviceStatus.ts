import { useEffect, useState } from 'react'

type Battery = { level: number; charging: boolean }

export function useDeviceStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [battery, setBattery] = useState<Battery | null>(null)
  const [batterySupported, setBatterySupported] = useState(false)

  useEffect(() => {
    const onlineHandler = () => setOnline(true)
    const offlineHandler = () => setOnline(false)
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)
    let manager: BatteryManager | null = null
    const update = () => {
      if (!manager) return
      setBattery({ level: manager.level, charging: manager.charging })
    }
    if (navigator.getBattery) {
      setBatterySupported(true)
      navigator.getBattery().then((next) => {
        manager = next
        update()
        next.addEventListener('levelchange', update)
        next.addEventListener('chargingchange', update)
      }).catch(() => setBatterySupported(false))
    }
    return () => {
      window.removeEventListener('online', onlineHandler)
      window.removeEventListener('offline', offlineHandler)
      if (manager) {
        manager.removeEventListener('levelchange', update)
        manager.removeEventListener('chargingchange', update)
      }
    }
  }, [])

  return { online, battery, batterySupported }
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title === 'StopAlert' ? title : `${title} · StopAlert`
  }, [title])
}
