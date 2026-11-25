export type TransportMode = 'train' | 'bus'

export type ThemeMode = 'light' | 'dark' | 'system'

export type LatLng = {
  lat: number
  lng: number
}

export type PublicUser = {
  id: string
  name: string
  email: string
  phone: string
  createdAt: string
}

export type StoredUser = PublicUser & {
  passwordHash: string
}

export type Contact = {
  id: string
  name: string
  phone: string
  relationship: string
  primary: boolean
}

export type Settings = {
  sound: boolean
  vibration: boolean
  browserNotifications: boolean
  defaultThresholds: number[]
  defaultWaitSeconds: number
}

export type PlaceSource = 'sample' | 'nominatim' | 'gps' | 'typed'

export type Place = {
  id: string
  name: string
  detail: string
  lat: number
  lng: number
  kind: 'station' | 'stop' | 'place'
  source: PlaceSource
}

export type Threshold = {
  id: string
  meters: number
  enabled: boolean
  firedAt?: string
}

export type EscalationRecord = {
  id: string
  at: string
  mode: 'simulated' | 'twilio' | 'whatsapp' | 'failed'
  accepted: boolean
  delivered: boolean
  detail: string
  preview?: string
  providerStatus?: string
}

export type Journey = {
  id: string
  mode: TransportMode
  originLabel: string
  origin?: LatLng
  destination: Place
  thresholds: Threshold[]
  emergency: {
    contactName: string
    contactPhone: string
    enabled: boolean
    waitSeconds: number
  }
  status: 'active' | 'completed' | 'cancelled'
  startedAt: string
  endedAt?: string
  acknowledgedAt?: string
  initialDistanceM?: number
  lastPosition?: LatLng & { accuracy: number; at: string; source: 'gps' | 'simulation' }
  escalations: EscalationRecord[]
  tracking: 'live' | 'sample'
  note?: string
}

export type SmsResult = {
  mode: 'simulated' | 'twilio' | 'whatsapp'
  accepted: boolean
  delivered: boolean
  preview: string
  detail: string
  providerStatus?: string
  providerSid?: string
}

export type FixSource = 'gps' | 'simulation'
