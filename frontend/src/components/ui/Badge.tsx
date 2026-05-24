import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'germination'
  | 'vegetative'
  | 'flowering'
  | 'flush'
  | 'harvest'
  | 'active'
  | 'completed'
  | 'paused'
  | 'default'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  germination: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  vegetative: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  flowering: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  flush: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  harvest: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  active: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  completed: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  paused: 'bg-gray-500/15 text-gray-400 border border-gray-500/20',
  default: 'bg-gray-800 text-gray-300 border border-gray-700',
}

export default function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
