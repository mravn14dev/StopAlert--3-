import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { cx } from '../lib/cx'

export const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-electric-500 focus:ring-4 focus:ring-electric-500/15 dark:border-white/10 dark:bg-navy-900 dark:text-white'

const variants = {
  primary: 'bg-electric-500 text-white shadow-sm hover:bg-electric-600',
  secondary:
    'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-navy-800 dark:text-white dark:hover:bg-navy-700',
  ghost: 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
}

export function buttonClass(variant: keyof typeof variants = 'primary', className?: string) {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    className,
  )
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return <button className={buttonClass(variant, className)} {...props} />
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldClass, props.className)} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldClass, 'min-h-24 resize-y', props.className)} />
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{hint}</span> : null}
      {error ? <span className="mt-1.5 block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cx(
        'rounded-2xl border border-slate-200/80 bg-white shadow-card dark:border-white/10 dark:bg-navy-800',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'blue' | 'green' | 'amber' | 'rose'
}) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200',
    blue: 'bg-electric-50 text-electric-700 dark:bg-electric-500/15 dark:text-electric-100',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
    amber: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
  }
  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone])}>
      {children}
    </span>
  )
}

export function Banner({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'amber' | 'rose' | 'blue'
  children: ReactNode
}) {
  const tones = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
    amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
    rose: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100',
    blue: 'border-electric-100 bg-electric-50 text-electric-900 dark:border-electric-500/30 dark:bg-electric-500/10 dark:text-electric-50',
  }
  return <div className={cx('rounded-xl border px-3.5 py-3 text-sm leading-6', tones[tone])}>{children}</div>
}
