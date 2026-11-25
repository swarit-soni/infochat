'use client'

import {
  IconAlertCircle as AlertCircle,
  IconCheck as Check
} from '@tabler/icons-react'

import { toPublicErrorPayload } from '@/lib/errors/public-error'
import type { TodoItem } from '@/lib/types/ai'
import { cn } from '@/lib/utils'

export type TodoListContentProps = {
  todos?: TodoItem[]
  message?: string
  summary?: string
  completedCount?: number
  totalCount?: number
  errorText?: string
  showSummary?: boolean
  itemVariant?: 'bordered' | 'plain'
  className?: string
}

export function TodoListContent({
  todos = [],
  message,
  summary,
  completedCount,
  totalCount,
  errorText,
  showSummary = true,
  itemVariant = 'bordered',
  className
}: TodoListContentProps) {
  const completed =
    completedCount ?? todos.filter(t => t.status === 'completed').length
  const total = totalCount ?? todos.length

  const getStatusIcon = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
      case 'in_progress':
        return (
          <div className="relative h-4 w-4 flex items-center justify-center flex-shrink-0">
            <div className="h-2 w-2 bg-(--md-sys-color-primary) rounded-full animate-ping absolute" />
            <div className="h-2 w-2 bg-(--md-sys-color-primary) rounded-full" />
          </div>
        )
      default:
        return (
          <div className="h-4 w-4 flex items-center justify-center flex-shrink-0">
            <div className="h-2 w-2 bg-(--md-sys-color-on-surface-variant) rounded-full" />
          </div>
        )
    }
  }

  if (errorText) {
    const publicError = toPublicErrorPayload(errorText, {
      fallbackMessage: 'Failed to process todos'
    })

    return (
      <div className="flex items-center gap-2 p-4 text-(--md-sys-color-error)">
        <AlertCircle className="size-4" />
        <span>Error: {publicError.error}</span>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {showSummary && (
        <div className="flex items-center justify-between text-sm text-(--md-sys-color-on-surface-variant)">
          <span>{message || summary || 'Todo List'}</span>
          <span className="font-medium whitespace-nowrap">
            ({completed}/{total})
          </span>
        </div>
      )}

      <ul className="space-y-2">
        {todos.map((todo, index) => (
          <li key={todo.id || index}>
            <div
              className={cn(
                'flex items-center gap-2',
                itemVariant === 'bordered'
                  ? 'justify-between p-3 rounded-lg border bg-(--md-sys-color-surface-container-low)'
                  : 'py-1'
              )}
            >
              {getStatusIcon(todo.status)}
              <p
                className={cn(
                  'text-sm',
                  todo.status === 'completed' &&
                    'text-(--md-sys-color-on-surface-variant)'
                )}
              >
                {todo.content}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {todos.length === 0 && (
        <div className="text-center py-8 text-(--md-sys-color-on-surface-variant)">
          No todos available
        </div>
      )}
    </div>
  )
}

export default TodoListContent
