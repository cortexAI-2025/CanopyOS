import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-600 hover:border-emerald-500 disabled:bg-emerald-900 disabled:border-emerald-900 disabled:text-emerald-600',
  secondary:
    'bg-transparent hover:bg-gray-800 text-gray-300 hover:text-gray-100 border border-gray-700 hover:border-gray-600 disabled:opacity-40',
  danger:
    'bg-red-600 hover:bg-red-500 text-white border border-red-600 hover:border-red-500 disabled:bg-red-900 disabled:border-red-900 disabled:text-red-600',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-sm rounded-lg',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 focus:ring-offset-gray-950 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
