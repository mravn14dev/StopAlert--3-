import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Button, Field, Input } from '../components/ui'
import { useApp } from '../context/AppState'
import { DEMO_EMAIL, DEMO_PASSWORD } from '../lib/storage'
import { useTitle } from '../hooks/useDeviceStatus'

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { user, login, signup } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/app'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useTitle(mode === 'login' ? 'Log in' : 'Sign up')

  if (user) return <Navigate to={from} replace />

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const message =
      mode === 'login' ? await login(email, password) : await signup({ name, email, phone, password })
    setBusy(false)
    if (message) {
      setError(message)
      return
    }
    navigate(from, { replace: true })
  }

  async function demo() {
    setBusy(true)
    setError('')
    const message = await login(DEMO_EMAIL, DEMO_PASSWORD)
    setBusy(false)
    if (message) {
      setError(message)
      return
    }
    navigate('/app', { replace: true })
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link to="/" className="w-fit">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-semibold tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Accounts in this demo live in this browser. Use the sample passenger to present the product immediately.
          </p>
          <form className="mt-8 space-y-4" onSubmit={submit}>
            {mode === 'signup' ? (
              <Field label="Name">
                <Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
              </Field>
            ) : null}
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </Field>
            {mode === 'signup' ? (
              <Field label="Mobile" hint="Optional. Enter a 10-digit Indian mobile (e.g. 9876543210) or international format (+91...).">
                <Input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
              </Field>
            ) : null}
            <Field label="Password" hint={mode === 'signup' ? 'At least 8 characters.' : undefined}>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={8}
              />
            </Field>
            {error ? (
              <p className="text-sm font-medium text-rose-600" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            </Button>
          </form>
          <Button type="button" variant="secondary" className="mt-3 w-full" disabled={busy} onClick={demo}>
            Sign in to the demo account
          </Button>
          <p className="mt-3 text-center text-xs text-slate-500">
            {DEMO_EMAIL} · {DEMO_PASSWORD}
          </p>
          <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
            {mode === 'login' ? (
              <>
                New here? <Link className="font-semibold text-electric-600" to="/signup">Create an account</Link>
              </>
            ) : (
              <>
                Already registered on this browser? <Link className="font-semibold text-electric-600" to="/login">Log in</Link>
              </>
            )}
          </p>
        </div>
      </div>
      <aside className="hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-electric-400">StopAlert</p>
        <div>
          <p className="text-4xl font-semibold tracking-tight">Never Miss Your Stop Again.</p>
          <p className="mt-4 max-w-md text-slate-300">
            Smart location-based alerts that wake you before your destination.
          </p>
        </div>
        <p className="text-sm text-slate-400">Foreground GPS. Distance thresholds. Contact escalation only after no response.</p>
      </aside>
    </div>
  )
}
