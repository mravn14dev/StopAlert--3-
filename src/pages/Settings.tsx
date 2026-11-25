import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Banner, Button, Card, Field, Input } from '../components/ui'
import { useApp } from '../context/AppState'
import { formatDistance } from '../lib/geo'
import { isE164 } from '../lib/validate'
import type { ThemeMode } from '../types'
import { useTitle } from '../hooks/useDeviceStatus'
import { cx } from '../lib/cx'

const PRESETS = [10000, 5000, 2000, 500]

export function SettingsPage() {
  const { user, theme, setTheme, settings, updateSettings, updateProfile, changePassword, resetData } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [profileMsg, setProfileMsg] = useState('')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [custom, setCustom] = useState('')
  const [notice, setNotice] = useState('')
  useTitle('Settings')

  function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    if (phone.trim() && !isE164(phone)) {
      setProfileMsg('Phone must be empty, a 10-digit Indian mobile, or international format (+91...).')
      return
    }
    const message = updateProfile({ name, phone })
    setProfileMsg(message || 'Profile saved on this device.')
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault()
    const message = await changePassword(current, next)
    setPasswordMsg(message || 'Password updated.')
    if (!message) {
      setCurrent('')
      setNext('')
    }
  }

  async function enableNotifications() {
    if (!('Notification' in window)) {
      setNotice('This browser does not support notifications.')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      updateSettings({ browserNotifications: true })
      setNotice('Notifications are allowed for this site.')
    } else {
      updateSettings({ browserNotifications: false })
      setNotice('Notifications stay off until the browser permission is allowed.')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">{user?.email}</p>
      </div>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Profile</h2>
        <form className="space-y-4" onSubmit={saveProfile}>
          <Field label="Name">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Mobile">
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
          {profileMsg ? <p className="text-sm">{profileMsg}</p> : null}
          <Button type="submit">Save profile</Button>
        </form>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Password</h2>
        <form className="space-y-4" onSubmit={savePassword}>
          <Field label="Current password">
            <Input type="password" value={current} onChange={(event) => setCurrent(event.target.value)} />
          </Field>
          <Field label="New password">
            <Input type="password" value={next} onChange={(event) => setNext(event.target.value)} minLength={8} />
          </Field>
          {passwordMsg ? <p className="text-sm">{passwordMsg}</p> : null}
          <Button type="submit" variant="secondary">
            Update password
          </Button>
        </form>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Appearance</h2>
        <div className="flex flex-wrap gap-2">
          {(['light', 'dark', 'system'] as ThemeMode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTheme(item)}
              className={cx(
                'rounded-full px-3 py-1.5 text-sm font-semibold capitalize',
                theme === item ? 'bg-navy-900 text-white dark:bg-electric-500' : 'bg-slate-100 dark:bg-white/10',
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Notifications</h2>
        <Toggle
          label="Alarm sound"
          checked={settings.sound}
          onChange={(sound) => updateSettings({ sound })}
        />
        <Toggle
          label="Vibration where the device supports it"
          checked={settings.vibration}
          onChange={(vibration) => updateSettings({ vibration })}
        />
        <Toggle
          label="Browser notification after permission"
          checked={settings.browserNotifications}
          onChange={(browserNotifications) => updateSettings({ browserNotifications })}
        />
        <Button type="button" variant="secondary" onClick={enableNotifications}>
          Request notification permission
        </Button>
        {notice ? <p className="text-sm">{notice}</p> : null}
        <div>
          <p className="text-sm font-medium">Default alert distances</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((meters) => {
              const on = settings.defaultThresholds.includes(meters)
              return (
                <button
                  key={meters}
                  type="button"
                  className={cx(
                    'rounded-full px-3 py-1.5 text-sm font-semibold',
                    on ? 'bg-navy-900 text-white dark:bg-electric-500' : 'bg-slate-100 dark:bg-white/10',
                  )}
                  onClick={() =>
                    updateSettings({
                      defaultThresholds: on
                        ? settings.defaultThresholds.filter((item) => item !== meters)
                        : [...settings.defaultThresholds, meters].sort((a, b) => b - a),
                    })
                  }
                >
                  {formatDistance(meters)}
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <Input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Custom metres" />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const meters = Math.round(Number(custom))
                if (!Number.isFinite(meters) || meters < 200 || meters > 80000) {
                  setNotice('Custom distance must be between 200 m and 80 km (80000 m).')
                  return
                }
                updateSettings({
                  defaultThresholds: [...new Set([...settings.defaultThresholds, meters])].sort((a, b) => b - a),
                })
                setCustom('')
                setNotice('')
              }}
            >
              Add
            </Button>
          </div>
        </div>
        <Field label="Default no-response wait (seconds)">
          <Input
            type="number"
            min={15}
            max={600}
            value={settings.defaultWaitSeconds}
            onChange={(event) => updateSettings({ defaultWaitSeconds: Number(event.target.value) })}
          />
        </Field>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">Background tracking</h2>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          StopAlert uses the browser Geolocation API. That stream is not reliable after the browser closes, the phone
          locks, or the operating system freezes the tab. A installed native app, or a platform that allows a
          foreground service, is required for alerts while the screen is off.
        </p>
      </Card>

      <Banner tone="amber">
        Resetting removes accounts, contacts, and journeys stored in this browser, then restores the demo passenger.
      </Banner>
      <Button
        type="button"
        variant="danger"
        onClick={async () => {
          if (window.confirm('Reset all StopAlert data in this browser?')) {
            await resetData()
            navigate('/')
          }
        }}
      >
        Reset demo data
      </Button>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm font-medium">
      {label}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}
