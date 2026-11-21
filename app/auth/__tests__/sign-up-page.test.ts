import { beforeEach, describe, expect, it, vi } from 'vitest'

import Page from '../sign-up/page'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { redirect } from 'next/navigation'

describe('sign-up page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /auth/login when no next param is provided', async () => {
    await Page({ searchParams: Promise.resolve({}) })

    expect(redirect).toHaveBeenCalledWith('/auth/login')
  })

  it('forwards safe next param to /auth/login', async () => {
    await Page({ searchParams: Promise.resolve({ next: '/search/abc123' }) })

    expect(redirect).toHaveBeenCalledWith('/auth/login?next=%2Fsearch%2Fabc123')
  })

  it('drops unsafe off-site next param when redirecting', async () => {
    await Page({
      searchParams: Promise.resolve({ next: '//evil.example.com' })
    })

    expect(redirect).toHaveBeenCalledWith('/auth/login')
  })
})
