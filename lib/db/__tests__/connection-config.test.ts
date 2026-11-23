import { describe, expect, it } from 'vitest'

import {
  buildConnectionConfig,
  resolveDatabaseUrl
} from '@/lib/db/connection-config'

describe('resolveDatabaseUrl', () => {
  it('prefers the restricted URL, then DATABASE_URL, then POSTGRES_URL', () => {
    expect(
      resolveDatabaseUrl({
        DATABASE_RESTRICTED_URL: 'postgres://r',
        DATABASE_URL: 'postgres://d',
        POSTGRES_URL: 'postgres://p'
      })
    ).toEqual({ url: 'postgres://r', source: 'DATABASE_RESTRICTED_URL' })
    expect(
      resolveDatabaseUrl({ DATABASE_URL: 'postgres://d', POSTGRES_URL: 'x' })
    ).toEqual({ url: 'postgres://d', source: 'DATABASE_URL' })
    expect(
      resolveDatabaseUrl({ DATABASE_URL: '  ', POSTGRES_URL: 'postgres://p' })
    ).toEqual({ url: 'postgres://p', source: 'POSTGRES_URL' })
  })

  it('returns undefined when nothing is configured', () => {
    expect(resolveDatabaseUrl({})).toBeUndefined()
  })
})

describe('buildConnectionConfig', () => {
  it('strips integration-only query params and honors sslmode=require', () => {
    const config = buildConnectionConfig(
      'postgres://u:p@aws-0.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x&pgbouncer=true',
      {}
    )
    expect(config.ssl).toBe('require')
    expect(config.url).toBe(
      'postgres://u:p@aws-0.pooler.supabase.com:6543/postgres'
    )
  })

  it('verifies certificates when no sslmode is given', () => {
    expect(
      buildConnectionConfig('postgres://u:p@db.example.com/x', {})
    ).toEqual({
      url: 'postgres://u:p@db.example.com/x',
      ssl: { rejectUnauthorized: true }
    })
  })

  it('disables TLS when DATABASE_SSL_DISABLED=true or sslmode=disable', () => {
    expect(
      buildConnectionConfig('postgres://u:p@localhost/x', {
        DATABASE_SSL_DISABLED: 'true'
      }).ssl
    ).toBe(false)
    expect(
      buildConnectionConfig('postgres://u:p@localhost/x?sslmode=disable', {})
        .ssl
    ).toBe(false)
  })

  it('keeps supported params such as application_name', () => {
    expect(
      buildConnectionConfig(
        'postgres://u:p@h/x?application_name=sera&supa=1',
        {}
      ).url
    ).toBe('postgres://u:p@h/x?application_name=sera')
  })
})
