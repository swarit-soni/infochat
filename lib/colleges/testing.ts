import { DEFAULT_COLLEGES } from './defaults'
import { buildDirectory, type ServerCollegeDirectory } from './directory'

/**
 * A stand-in for `@/lib/colleges/store` in tests: the built-in colleges with
 * the current `process.env` overrides, and no database.
 *
 *   vi.mock('@/lib/colleges/store', async () =>
 *     (await import('@/lib/colleges/testing')).collegeStoreMock()
 *   )
 */
export function collegeStoreMock() {
  return {
    getCollegeDirectory: async (): Promise<ServerCollegeDirectory> =>
      buildDirectory(DEFAULT_COLLEGES, [], process.env),
    toPublicDirectory: (directory: ServerCollegeDirectory) => ({
      list: directory.list,
      bySlug: directory.bySlug
    }),
    invalidateCollegeDirectory: () => {}
  }
}
