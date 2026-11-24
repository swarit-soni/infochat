import { useEffect } from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { listFiles } from '@/lib/actions/files'
import type { KnowledgeLibraryItem } from '@/lib/actions/knowledge'
import { listKnowledgeDocuments } from '@/lib/actions/knowledge'
import { listNotes } from '@/lib/actions/notes'

import { SidebarProvider } from '@/components/ui/sidebar'

import { LibraryProvider, useLibrary } from '../library-context'
import { LibraryPanel } from '../library-panel'

vi.mock('@/lib/analytics/posthog-client', () => ({
  captureClient: vi.fn()
}))

vi.mock('@/lib/actions/knowledge', () => ({
  listKnowledgeDocuments: vi.fn()
}))

vi.mock('@/lib/actions/notes', () => ({
  listNotes: vi.fn(),
  deleteNote: vi.fn()
}))

vi.mock('@/lib/actions/files', () => ({
  listFiles: vi.fn(),
  deleteFile: vi.fn()
}))

vi.mock('@/components/message', () => ({
  MarkdownMessage: ({ message }: { message: string }) => <div>{message}</div>
}))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false
}))

const document: KnowledgeLibraryItem = {
  id: 'doc-1',
  title: 'Mid-semester exam schedule',
  domain: 'examinations',
  sourceSystem: 'jecrc_enotice',
  authority: 'jecrc',
  priority: 'urgent',
  program: null,
  semester: '3',
  effectiveDate: new Date('2026-11-01T00:00:00Z'),
  expiresAt: null,
  actionRequired: 'Download your admit card by Friday.',
  sourceUrl: 'https://example.edu/notice/1',
  content: 'Exams begin on 1 December in Block A.',
  updatedAt: new Date('2026-11-02T00:00:00Z')
}

function OpenLibrary() {
  const { openLibrary } = useLibrary()
  useEffect(() => {
    openLibrary()
  }, [openLibrary])
  return null
}

function renderPanel() {
  render(
    <SidebarProvider>
      <LibraryProvider>
        <OpenLibrary />
        <LibraryPanel />
      </LibraryProvider>
    </SidebarProvider>
  )
}

describe('LibraryPanel knowledge base', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listKnowledgeDocuments).mockResolvedValue({
      success: true,
      documents: [document],
      nextCursor: null,
      hasMore: false
    })
    vi.mocked(listNotes).mockResolvedValue({
      success: true,
      notes: [],
      nextCursor: null,
      hasMore: false
    })
    vi.mocked(listFiles).mockResolvedValue({
      success: true,
      files: [],
      nextCursor: null,
      hasMore: false
    } as never)
  })

  test('opens on the knowledge base and lists its documents', async () => {
    renderPanel()

    expect(
      await screen.findByText('Mid-semester exam schedule')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Knowledge base' })
    ).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Urgent')).toBeInTheDocument()
    expect(listNotes).not.toHaveBeenCalled()
    expect(listFiles).not.toHaveBeenCalled()
  })

  test('shows a document with its details and source link', async () => {
    renderPanel()

    fireEvent.click(await screen.findByText('Mid-semester exam schedule'))

    expect(
      screen.getByText('Exams begin on 1 December in Block A.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Download your admit card by Friday.')
    ).toBeInTheDocument()
    expect(screen.getByText('JECRC e-notice')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View source/ })).toHaveAttribute(
      'href',
      'https://example.edu/notice/1'
    )
  })

  test('loads saved notes and files only when the Saved tab is chosen', async () => {
    renderPanel()
    await screen.findByText('Mid-semester exam schedule')

    fireEvent.click(screen.getByRole('button', { name: 'Saved' }))

    await waitFor(() => {
      expect(listNotes).toHaveBeenCalled()
      expect(listFiles).toHaveBeenCalled()
    })
    expect(await screen.findByText('No saved items yet.')).toBeInTheDocument()
  })
})
