import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Pill, buttonClass } from '../components/ui'
import { useApp } from '../context/AppState'
import { formatDistance } from '../lib/geo'
import { useTitle } from '../hooks/useDeviceStatus'
import { cx } from '../lib/cx'

function when(iso?: string) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

export function HistoryPage() {
  const { journeys } = useApp()
  const [filter, setFilter] = useState<'all' | 'train' | 'bus'>('all')
  useTitle('Journey history')
  const list = journeys.filter((journey) => filter === 'all' || journey.mode === filter)

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Journey history</h1>
          <p className="mt-1 text-sm text-slate-500">Stored on this device. Sample rows are labeled and were not tracked live.</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'train', 'bus'] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={cx(
                'rounded-full px-3 py-1.5 text-sm font-semibold capitalize',
                filter === item ? 'bg-navy-900 text-white dark:bg-electric-500' : 'bg-white text-slate-600 dark:bg-navy-800',
              )}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <Card className="p-6 text-sm">
          Nothing in this filter. <Link className="font-semibold text-electric-600" to="/app/new">Start a journey</Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((journey) => (
            <Card key={journey.id} className="p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{journey.destination.name}</h2>
                    <Pill tone={journey.status === 'active' ? 'green' : journey.status === 'completed' ? 'blue' : 'neutral'}>
                      {journey.status}
                    </Pill>
                    {journey.tracking === 'sample' ? <Pill tone="amber">Sample record</Pill> : null}
                  </div>
                  <p className="mt-1 text-sm capitalize text-slate-500">
                    {journey.mode} · from {journey.originLabel}
                  </p>
                </div>
                {journey.status === 'active' ? (
                  <Link to="/app/live" className={buttonClass('primary')}>
                    Open live
                  </Link>
                ) : null}
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-slate-500">Started</dt>
                  <dd>{when(journey.startedAt)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Ended</dt>
                  <dd>{when(journey.endedAt)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Alerts</dt>
                  <dd>{journey.thresholds.map((item) => formatDistance(item.meters)).join(', ')}</dd>
                </div>
              </dl>
              {journey.note ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{journey.note}</p> : null}
              {journey.escalations.length ? (
                <ul className="mt-3 space-y-2">
                  {journey.escalations.map((item) => (
                    <li key={item.id} className="text-sm text-slate-600 dark:text-slate-300">
                      {item.mode === 'simulated' ? 'Simulated, not sent. ' : item.mode === 'failed' ? 'Not sent. ' : ''}
                      {item.detail}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No emergency notification was attempted.</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
