import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { signInWithGoogle } from '@/lib/actions/auth'
import { AppUserProvider } from '@/lib/contexts/app-user-context'

import { LoginForm } from '@/components/login-form'

vi.mock('@/lib/actions/auth', () => ({
  signInWithGoogle: vi.fn()
}))

const capabilities = {
  signUp: false,
  passwordReset: false,
  deleteUser: true,
  oauth: true,
  oauthProvider: null as string | null,
  emailVerification: false,
  share: true
}

function renderForm(
  override: Partial<typeof capabilities> = {},
  next?: string,
  initialError?: string | null,
  isBeta?: boolean,
  mode?: 'student' | 'mentor'
) {
  return render(
    <AppUserProvider
      user={null}
      capabilities={{ ...capabilities, ...override }}
    >
      <LoginForm
        mentorCollege={mode === 'mentor' ? 'kalvium' : undefined}
        mentorCollegeName={mode === 'mentor' ? 'Kalvium' : undefined}
        mentorDomains={mode === 'mentor' ? ['kalvium.com'] : []}
        next={next}
        initialError={initialError}
        isBeta={isBeta}
      />
    </AppUserProvider>
  )
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.cookie = 'auth_next=; path=/; max-age=0; SameSite=Lax'
  })

  it('renders an open Google sign-in card with a small link to mentor login', () => {
    renderForm()

    expect(screen.getByText('Sign in to Sera')).toBeInTheDocument()
    expect(
      screen.getByText('Sign in with your Google account.')
    ).toBeInTheDocument()
    expect(screen.queryByText('@kalvium.community')).not.toBeInTheDocument()
    expect(screen.queryByText('@kalvium.com')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Sign In with Google' })
    ).toBeInTheDocument()

    const mentorLink = screen.getByRole('link', { name: 'Staff login' })
    expect(mentorLink).toHaveAttribute('href', '/auth/mentor')

    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /sign up/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /forgot password/i })
    ).not.toBeInTheDocument()
  })

  it('renders mentor sign-in card in mentor mode with link back to regular login and preserves next', () => {
    renderForm({}, '/kalvium/mentor', null, false, 'mentor')

    expect(screen.getByText('Staff sign in')).toBeInTheDocument()
    expect(screen.getByText('@kalvium.com')).toBeInTheDocument()
    expect(screen.getByText('Staff')).toBeInTheDocument()
    expect(screen.queryByText('@kalvium.community')).not.toBeInTheDocument()

    const studentLink = screen.getByRole('link', { name: 'Regular login' })
    expect(studentLink).toHaveAttribute(
      'href',
      '/auth/login?next=%2Fkalvium%2Fmentor'
    )
    expect(screen.getByText('Kalvium')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Staff at a different college?' })
    ).toHaveAttribute('href', '/auth/mentor')
  })

  it("calls signInWithGoogle with the mentor's college and defaults redirect to its mentor dashboard", async () => {
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' }
    })
    vi.mocked(signInWithGoogle).mockResolvedValue({
      success: true,
      redirectTo: 'https://accounts.google.com/authorize'
    })
    renderForm({}, undefined, null, false, 'mentor')

    fireEvent.click(screen.getByRole('button', { name: 'Sign In with Google' }))

    await waitFor(() => {
      expect(signInWithGoogle).toHaveBeenCalledWith('kalvium')
    })
    expect(document.cookie).toContain('auth_next=%2Fkalvium%2Fmentor')

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation
    })
  })

  it('renders an initial error message when provided', () => {
    renderForm(
      {},
      undefined,
      'Only @kalvium.com (Mentor) and @kalvium.community (Student) Google accounts are allowed.'
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only @kalvium.com (Mentor) and @kalvium.community (Student) Google accounts are allowed.'
    )
  })

  it('redirects to the identity provider for Google sign-in', async () => {
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' }
    })
    vi.mocked(signInWithGoogle).mockResolvedValue({
      success: true,
      redirectTo: 'https://accounts.google.com/authorize'
    })
    renderForm()

    fireEvent.click(screen.getByRole('button', { name: 'Sign In with Google' }))

    await waitFor(() => {
      expect(signInWithGoogle).toHaveBeenCalledWith(undefined)
      expect(window.location.href).toBe('https://accounts.google.com/authorize')
    })

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation
    })
  })

  it('surfaces errors returned by signInWithGoogle', async () => {
    vi.mocked(signInWithGoogle).mockResolvedValue({
      success: false,
      error: 'OAuth is temporarily unavailable'
    })
    renderForm()

    fireEvent.click(screen.getByRole('button', { name: 'Sign In with Google' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'OAuth is temporarily unavailable'
      )
    })
  })

  it('carries the safe next target to the OAuth callback via a cookie', async () => {
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' }
    })
    vi.mocked(signInWithGoogle).mockResolvedValue({
      success: true,
      redirectTo: 'https://accounts.google.com/authorize'
    })
    renderForm({}, '/search/abc123')

    fireEvent.click(screen.getByRole('button', { name: 'Sign In with Google' }))

    await waitFor(() => {
      expect(signInWithGoogle).toHaveBeenCalled()
    })
    expect(document.cookie).toContain('auth_next=%2Fsearch%2Fabc123')

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation
    })
  })

  it('sanitizes off-site and backslash-normalized next targets in cookie', async () => {
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' }
    })
    vi.mocked(signInWithGoogle).mockResolvedValue({
      success: true,
      redirectTo: 'https://accounts.google.com/authorize'
    })
    renderForm({}, '//evil.example.com')

    fireEvent.click(screen.getByRole('button', { name: 'Sign In with Google' }))

    await waitFor(() => {
      expect(signInWithGoogle).toHaveBeenCalled()
    })
    expect(document.cookie).toContain('auth_next=%2F')
    expect(document.cookie).not.toContain('evil.example.com')

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation
    })
  })

  it('clears a stale next cookie when the later login has no destination', async () => {
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' }
    })
    document.cookie = 'auth_next=%2Fstale; path=/; max-age=300; SameSite=Lax'
    vi.mocked(signInWithGoogle).mockResolvedValue({
      success: true,
      redirectTo: 'https://accounts.google.com/authorize'
    })
    renderForm()

    fireEvent.click(screen.getByRole('button', { name: 'Sign In with Google' }))

    await waitFor(() => {
      expect(signInWithGoogle).toHaveBeenCalled()
    })
    expect(document.cookie).not.toContain('auth_next')

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation
    })
  })

  it('hides the Google button when the provider has no OAuth', () => {
    renderForm({ oauth: false })
    expect(
      screen.queryByRole('button', { name: 'Sign In with Google' })
    ).not.toBeInTheDocument()
  })

  it('shows the Beta badge only when isBeta is true', () => {
    const { rerender } = renderForm()
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()

    rerender(
      <AppUserProvider user={null} capabilities={capabilities}>
        <LoginForm isBeta />
      </AppUserProvider>
    )
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('explains when a college has no mentor sign-in set up', () => {
    render(
      <AppUserProvider user={null} capabilities={capabilities}>
        <LoginForm mentorCollege="bkbirla" mentorDomains={[]} />
      </AppUserProvider>
    )
    expect(screen.getByText('Sign-in not set up yet')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Sign In with Google' })
    ).not.toBeInTheDocument()
  })
})
