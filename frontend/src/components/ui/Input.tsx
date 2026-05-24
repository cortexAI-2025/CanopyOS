import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500',
          'rounded-lg px-3.5 py-2.5 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors duration-150',
          // Date input styling
          '[color-scheme:dark]',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export default Input
