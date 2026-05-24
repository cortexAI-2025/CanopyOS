import { SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none bg-gray-800 border border-gray-700 text-gray-100',
            'rounded-lg px-3.5 py-2.5 text-sm pr-9',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-150',
            '[color-scheme:dark]',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {/* Chevron icon */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select
