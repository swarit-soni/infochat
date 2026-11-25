'use client'

import * as React from 'react'

import * as TogglePrimitive from '@radix-ui/react-toggle'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const toggleVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-(--md-sys-color-surface) transition-colors hover:bg-(--md-sys-color-surface-container) hover:text-(--md-sys-color-on-surface-variant) focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--md-sys-color-primary) focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 gap-2',
  {
    variants: {
      variant: {
        default:
          'bg-transparent data-[state=on]:bg-(--md-sys-color-surface-container-high) data-[state=on]:text-(--md-sys-color-on-surface)',
        outline:
          'border border-(--md-sys-color-outline) hover:bg-(--md-sys-color-surface-container-high) hover:text-(--md-sys-color-on-surface) data-[state=on]:bg-(--md-sys-color-surface-container-high) data-[state=on]:text-(--md-sys-color-on-surface)'
      },
      size: {
        default: 'h-10 px-3 min-w-10',
        sm: 'h-9 px-2.5 min-w-9',
        lg: 'h-11 px-5 min-w-11'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
))

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }
