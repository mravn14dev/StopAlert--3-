import { MapPin } from 'lucide-react'
import { cx } from '../lib/cx'

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5 font-semibold tracking-tight', className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy-900 text-white shadow-sm dark:bg-electric-500">
        <MapPin className="h-4 w-4" strokeWidth={2.4} />
      </span>
      <span className={light ? 'text-white' : 'text-navy-900 dark:text-white'}>StopAlert</span>
    </span>
  )
}
