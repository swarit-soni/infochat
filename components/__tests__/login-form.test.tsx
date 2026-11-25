import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { signInStudentWithGoogle, signInWithGoogle } from '@/lib/actions/auth'
import { AppUserProvider } from '@/lib/contexts/app-user-context'

import { LoginForm, type StudentCollegeOption } from '@/components/login-form'

vi.mock('@/lib/actions/auth', () => ({
  signInWithGoogle: vi.fn(),
  signInStudentWithGoogle: vi.fn()
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

const sampleColleges: StudentCollegeOption[] = [
  {
    slug: 'kalvium',
    name: 'Kalvium',
    shortName: 'Kalvium',
    location: '',
    studentDomains: ['kalvium.community']
  },
  {
    slug: 'bkbirla',
    name: 'B. K. Birla College of Arts, Science & Commerce (Autonomous), Kalyan',
    shortName: 'B.K. Birla College',
    location: 'Kalyan, Maharashtra',
    studentDomains: ['bkbck.edu.in']
  },
  {
    slug: 'sera-demo',
    name: 'Sera Demo University (fictional)',
    shortName: 'Sera Demo University',
    location: 'Demo City (fictional)',
    studentDomains: [],
    openAccess: true
  },
  {
    slug: 'unconfigured',
    name: 'Unconfigured College',
    shortName: 'Unconfigured',
    location: 'Nowhere',
    studentDomains: []
  }
]

function renderForm(
  override: Partial<typeof capabilities> = {},
  next?: string,
  initialError?: string | null,
  isBeta?: boolean,
  mode?: 'student' | 'mentor',
  extra: {
    studentColleges?: StudentCollegeOption[]
    initialCollege?: string | null
  } = {}
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
        studentColleges={
          mode === 'mentor'
            ? undefined
            : (extra.studentColleges ?? sampleColleges)
        }
        initialCollege={extra.initialCollege}
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

  it('renders college selection first in student mode with demo first, then Not enrolled yet, then configured colleges', () => {
    renderForm()

    expect(screen.getByText('Sign in to Sera')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Choose your college first, then sign in with your Google account.'
      )
    ).toBeInTheDocument()

    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(radios.map(radio => radio.value)).toEqual([
      'sera-demo',
      'none',
      'kalvium',
      'bkbirla',
      'unconfigured'
    ])
    expect(radios[0]).not.toBeDisabled()
    expect(radios[1]).not.toBeDisabled()
    expect(radios[2]).not.toBeDisabled()
    expect(radios[3]).not.toBeDisabled()
    expect(radios[4]).toBeDisabled()

    expect(
      screen.getByText(/Kalyan, Maharashtra · @bkbck\.edu\.in/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Nowhere · Student sign-in not set up yet/)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Sign In with Google' })
    ).not.toBeInTheDocument()

    const mentorLink = screen.getByRole('link', { name: 'Staff login' })
    expect(mentorLink).toHaveAttribute('href', '/auth/mentor')

    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
  })

  it('requires choosing an option before continuing to Google sign-in', () => {
    renderForm()

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please choose an option.'
    )
    expect(
      screen.queryByRole('button', { name: 'Sign In with Google' })
    ).not.toBeInTheDocument()
  })

  it('advances to Google sign-in after picking a college and calls signInStudentWithGoogle', async () => {
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' }
    })
    vi.mocked(signInStudentWithGoogle).mockResolvedValue({
      success: true,
      redirectTo: 'https://accounts.google.com/authorize'
    })
    renderForm({}, '/search/abc123')

    fireEvent.click(screen.getByDisplayValue('bkbirla'))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('B.K. Birla College')).toBeInTheDocument()
    expect(screen.getByText('@bkbck.edu.in')).toBeInTheDocument()
    expect(screen.getByText('Student')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sign In with Google' }))

    await waitFor(() => {
      expect(signInStudentWithGoogle).toHaveBeenCalledWith('bkbirla')
      expect(window.location.href).toBe('https://accounts.google.com/authorize')
    })
    expect(document.cookie).toContain('auth_next=%2Fsearch%2Fabc123')

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation
    })
  })

  it('supports going back to change college and reopening directly on step 2 after an OAuth error', () => {
    renderForm(
      {},
      undefined,
      'Please sign in with your B.K. Birla College Google account (@bkbck.edu.in).',
      false,
      'student',
      { initialCollege: 'bkbirla' }
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please sign in with your B.K. Birla College Google account (@bkbck.edu.in).'
    )
    expect(
      screen.getByRole('button', { name: 'Sign In with Google' })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Change college' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
  })

  it('surfaces errors returned by signInStudentWithGoogle', async () => {
    vi.mocked(signInStudentWithGoogle).mockResolvedValue({
      success: false,
      error: 'OAuth is temporarily unavailable'
    })
    renderForm({}, undefined, null, false, 'student', {
      initialCollege: 'sera-demo'
    })

    fireEvent.click(screen.getByRole('button', { name: 'Sign In with Google' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'OAuth is temporarily unavailable'
      )
    })
  })

  it('sanitizes off-site next targets and clears stale auth_next cookie in student flow', async () => {
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' }
    })
    vi.mocked(signInStudentWithGoogle).mockResolvedValue({
      success: true,
      redirectTo: 'https://accounts.google.com/authorize'
    })

    const { unmount } = renderForm(
      {},
      '//evil.example.com',
      null,
      false,
      'student',
      {
        initialCollege: 'none'
      }
    )
    fireEvent.click(screen.getByRole('button', { name: 'Sign In with Google' }))
    await waitFor(() => {
      expect(signInStudentWithGoogle).toHaveBeenCalledWith('none')
    })
    expect(document.cookie).toContain('auth_next=%2F')
    expect(document.cookie).not.toContain('evil.example.com')

    unmount()
    document.cookie = 'auth_next=%2Fstale; path=/; max-age=300; SameSite=Lax'
    renderForm({}, undefined, null, false, 'student', {
      initialCollege: 'sera-demo'
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In with Google' }))
    await waitFor(() => {
      expect(signInStudentWithGoogle).toHaveBeenCalledWith('sera-demo')
    })
    expect(document.cookie).not.toContain('auth_next')

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation
    })
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

  it('hides the Google button and college picker when the provider has no OAuth', () => {
    renderForm({ oauth: false })
    expect(
      screen.queryByRole('button', { name: 'Sign In with Google' })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
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
