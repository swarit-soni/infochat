import { describe, expect, test, vi } from 'vitest'

import { parseVersionCheckConfig } from '../config'

describe('parseVersionCheckConfig', () => {
  test.each([
    {
      name: 'defaults when nothing is set',
      env: {},
      expected: {
        repo: 'swarit-soni/infochat',
        ttlSeconds: 86400,
        disabled: false
      }
    },
    {
      name: 'repo override',
      env: { SERA_UPDATE_CHECK_REPO: 'acme/sera' },
      expected: {
        repo: 'acme/sera',
        ttlSeconds: 86400,
        disabled: false
      }
    },
    {
      name: 'ttl override',
      env: { SERA_UPDATE_CHECK_TTL_SECONDS: '3600' },
      expected: {
        repo: 'swarit-soni/infochat',
        ttlSeconds: 3600,
        disabled: false
      }
    },
    {
      name: 'ttl below floor clamps to 300',
      env: { SERA_UPDATE_CHECK_TTL_SECONDS: '10' },
      expected: {
        repo: 'swarit-soni/infochat',
        ttlSeconds: 300,
        disabled: false
      }
    },
    {
      name: 'ttl at the floor stays at 300',
      env: { SERA_UPDATE_CHECK_TTL_SECONDS: '300' },
      expected: {
        repo: 'swarit-soni/infochat',
        ttlSeconds: 300,
        disabled: false
      }
    },
    {
      name: 'non-numeric ttl falls back to the default',
      env: { SERA_UPDATE_CHECK_TTL_SECONDS: 'banana' },
      expected: {
        repo: 'swarit-soni/infochat',
        ttlSeconds: 86400,
        disabled: false
      }
    },
    {
      name: 'empty ttl falls back to the default',
      env: { SERA_UPDATE_CHECK_TTL_SECONDS: '' },
      expected: {
        repo: 'swarit-soni/infochat',
        ttlSeconds: 86400,
        disabled: false
      }
    },
    {
      name: 'fractional ttl is truncated',
      env: { SERA_UPDATE_CHECK_TTL_SECONDS: '3600.9' },
      expected: {
        repo: 'swarit-soni/infochat',
        ttlSeconds: 3600,
        disabled: false
      }
    },
    {
      name: 'disabled flag',
      env: { SERA_UPDATE_CHECK_DISABLED: 'true' },
      expected: {
        repo: 'swarit-soni/infochat',
        ttlSeconds: 86400,
        disabled: true
      }
    },
    {
      name: 'disabled only matches the literal true',
      env: { SERA_UPDATE_CHECK_DISABLED: 'yes' },
      expected: {
        repo: 'swarit-soni/infochat',
        ttlSeconds: 86400,
        disabled: false
      }
    }
  ])('$name', ({ env, expected }) => {
    expect(parseVersionCheckConfig(env)).toEqual(expected)
  })

  test('valid repo variants pass through', () => {
    expect(
      parseVersionCheckConfig({
        SERA_UPDATE_CHECK_REPO: 'acme-foundation/sera.rs'
      }).repo
    ).toBe('acme-foundation/sera.rs')
  })

  test('invalid repo values fall back to the default with a warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const invalid = [
      'https://github.com/acme/sera',
      'acme/sera/',
      'acme/sera/extra',
      'not a repo',
      'acme'
    ]
    for (const repo of invalid) {
      expect(
        parseVersionCheckConfig({ SERA_UPDATE_CHECK_REPO: repo }).repo
      ).toBe('swarit-soni/infochat')
    }
    expect(warnSpy).toHaveBeenCalledTimes(invalid.length)

    warnSpy.mockRestore()
  })
})
