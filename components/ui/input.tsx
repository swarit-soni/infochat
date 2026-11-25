import * as React from 'react'

import { cn } from '@/lib/utils/index'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-(--md-sys-color-outline) bg-(--md-sys-color-surface) px-3 py-2 text-sm ring-offset-(--md-sys-color-surface) file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-(--md-sys-color-on-surface-variant) focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--md-sys-color-primary) focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
