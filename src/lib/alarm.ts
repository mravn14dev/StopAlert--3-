let context: AudioContext | null = null
let timer = 0
let vibrating = 0

function audioContext() {
  if (!context) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    context = new Ctx()
  }
  return context
}

function beep() {
  const ctx = audioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  const now = ctx.currentTime
  const tones = [
    { freq: 880, at: 0 },
    { freq: 660, at: 0.42 },
  ]
  for (const tone of tones) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = tone.freq
    gain.gain.setValueAtTime(0.0001, now + tone.at)
    gain.gain.exponentialRampToValueAtTime(0.2, now + tone.at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.at + 0.32)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now + tone.at)
    osc.stop(now + tone.at + 0.34)
  }
}

export function primeAudio() {
  const ctx = audioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx.state
}

export function audioIsRunning() {
  return context?.state === 'running'
}

export function startAlarm(options: { audible: boolean; vibrate: boolean }) {
  stopAlarmSound()
  if (options.audible) {
    primeAudio()
    beep()
    timer = window.setInterval(beep, 1300)
  }
  if (options.vibrate && typeof navigator.vibrate === 'function') {
    const pulse = () => {
      navigator.vibrate?.([280, 140, 280, 140, 520])
    }
    pulse()
    vibrating = window.setInterval(pulse, 1300)
  }
}

export function stopAlarmSound() {
  if (timer) window.clearInterval(timer)
  timer = 0
  if (vibrating) window.clearInterval(vibrating)
  vibrating = 0
  if (typeof navigator.vibrate === 'function') navigator.vibrate(0)
}

export async function sendBrowserNotification(title: string, body: string) {
  if (!('Notification' in window)) return 'unsupported' as const
  if (Notification.permission !== 'granted') return 'blocked' as const
  try {
    new Notification(title, { body, tag: 'stopalert-approach' })
    return 'shown' as const
  } catch {
    return 'blocked' as const
  }
}
