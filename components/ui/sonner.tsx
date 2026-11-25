'use client'

import { Toaster as Sonner } from 'sonner'

import { useTheme } from '@/components/theme-provider'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-(--md-sys-color-surface) group-[.toaster]:text-(--md-sys-color-on-surface) group-[.toaster]:border-(--md-sys-color-outline-variant) group-[.toaster]:shadow-lg',
          description:
            'group-[.toast]:text-(--md-sys-color-on-surface-variant)',
          actionButton:
            'group-[.toast]:bg-(--md-sys-color-primary) group-[.toast]:text-(--md-sys-color-on-primary)',
          cancelButton:
            'group-[.toast]:bg-(--md-sys-color-surface-container) group-[.toast]:text-(--md-sys-color-on-surface-variant)'
        }
      }}
      {...props}
    />
  )
}

export { Toaster }
