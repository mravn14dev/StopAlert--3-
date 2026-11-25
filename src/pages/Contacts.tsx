import { useState } from 'react'
import { Button, Card, Field, Input, Pill } from '../components/ui'
import { useApp } from '../context/AppState'
import { isE164, normalizePhone, whatsappLink } from '../lib/validate'
import type { Contact } from '../types'
import { useTitle } from '../hooks/useDeviceStatus'

const empty = { name: '', phone: '', relationship: '', primary: true }

export function ContactsPage() {
  const { contacts, saveContact, deleteContact, user, smsMode } = useApp()
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState('')
  const [previewNote, setPreviewNote] = useState('')
  const [busy, setBusy] = useState(false)
  useTitle('Emergency contacts')

  function edit(contact: Contact) {
    setEditing(contact.id)
    setForm({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      primary: contact.primary,
    })
    setError('')
  }

  function save(event: React.FormEvent) {
    event.preventDefault()
    if (form.name.trim().length < 2) return setError('Enter a name.')
    if (!isE164(form.phone)) return setError('Enter a 10-digit Indian mobile (e.g. 9876543210) or +919876543210.')
    saveContact({
      id: editing || crypto.randomUUID(),
      name: form.name.trim(),
      phone: normalizePhone(form.phone),
      relationship: form.relationship.trim(),
      primary: form.primary || contacts.length === 0,
    })
    setForm(empty)
    setEditing(null)
    setError('')
  }

  async function test(contact: Contact) {
    setBusy(true)
    setPreview('')
    setPreviewNote('')
    try {
      const response = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testOnly: true,
          passengerName: user?.name || 'Passenger',
          destination: 'Preview destination',
          remainingMeters: 1800,
          etaText: 'Estimated arrival is unavailable.',
          lat: 13.0827,
          lng: 80.2757,
          contactName: contact.name,
          contactPhone: contact.phone,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setPreviewNote(data.error || 'Preview failed. Nothing was sent.')
      } else {
        setPreview(data.preview || '')
        setPreviewNote(data.detail || 'This is a preview.')
      }
    } catch {
      setPreviewNote('The notification service could not be reached. Nothing was sent.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="p-5">
        <h1 className="text-2xl font-semibold tracking-tight">{editing ? 'Edit contact' : 'Add a contact'}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {smsMode === 'whatsapp'
            ? 'WhatsApp API credentials are on the server. A preview still does not send a message.'
            : smsMode === 'twilio'
              ? 'SMS credentials are on the server. A preview still does not send a message.'
              : 'Demo mode does not send SMS or WhatsApp automatically. Previews are labeled as simulations.'}
        </p>
        <form className="mt-5 space-y-4" onSubmit={save}>
          <Field label="Name">
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          <Field label="Mobile" hint="10-digit Indian numbers (e.g. 9876543210) automatically save as +91.">
            <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+919876543210 or 9876543210" />
          </Field>
          <Field label="Relationship">
            <Input value={form.relationship} onChange={(event) => setForm({ ...form, relationship: event.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.primary}
              onChange={(event) => setForm({ ...form, primary: event.target.checked })}
            />
            Primary contact
          </label>
          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit">{editing ? 'Save contact' : 'Add contact'}</Button>
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(null)
                  setForm(empty)
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
      <div className="space-y-3">
        {contacts.length === 0 ? (
          <Card className="p-5 text-sm text-slate-600 dark:text-slate-300">No emergency contacts saved on this device.</Card>
        ) : (
          contacts.map((contact) => (
            <Card key={contact.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{contact.name}</h2>
                  <p className="text-sm text-slate-500">{contact.phone}</p>
                  {contact.relationship ? <p className="mt-1 text-sm">{contact.relationship}</p> : null}
                </div>
                {contact.primary ? <Pill tone="blue">Primary</Pill> : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => edit(contact)}>
                  Edit
                </Button>
                <Button type="button" variant="secondary" disabled={busy} onClick={() => test(contact)}>
                  Preview message
                </Button>
                <a className="inline-flex items-center rounded-xl px-3 text-sm font-semibold text-electric-600" href={`tel:${contact.phone}`}>
                  Call
                </a>
                <a
                  className="inline-flex items-center rounded-xl px-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                  href={whatsappLink(
                    contact.phone,
                    `Hi ${contact.name}, I added you as my StopAlert emergency contact.`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
                <Button type="button" variant="ghost" onClick={() => deleteContact(contact.id)}>
                  Remove
                </Button>
              </div>
            </Card>
          ))
        )}
        {previewNote ? (
          <Card className="p-5 text-sm leading-6">
            <Pill tone="amber">Not a delivery receipt</Pill>
            <p className="mt-2">{previewNote}</p>
            {preview ? <p className="mt-2 text-slate-500">{preview}</p> : null}
          </Card>
        ) : null}
      </div>
    </div>
  )
}
