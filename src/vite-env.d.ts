/// <reference types="vite/client" />

interface BatteryManager extends EventTarget {
  level: number
  charging: boolean
}

interface Navigator {
  getBattery?: () => Promise<BatteryManager>
}
