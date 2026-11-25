import { ReactNode } from 'react'

import { type TablerIcon } from '@tabler/icons-react'

interface StatusIndicatorProps {
  icon: TablerIcon
  iconClassName?: string
  children?: ReactNode
}

export function StatusIndicator({
  icon: Icon,
  iconClassName,
  children
}: StatusIndicatorProps) {
  return (
    <span className="flex items-center gap-1 text-(--md-sys-color-on-surface-variant) text-xs">
      <Icon size={16} className={iconClassName} />
      {children && <span>{children}</span>}
    </span>
  )
}
