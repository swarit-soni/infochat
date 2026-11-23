export interface ReleaseVersion {
  major: number
  minor: number
  patch: number
}

interface ParsedCurrentVersion extends ReleaseVersion {
  prerelease: string | null
}

/**
 * Parses a release tag such as `v1.8.0` (or `1.8.0`) into its numeric parts.
 * Returns null for anything that is not a plain `X.Y.Z` version, so prerelease
 * tags like `v1.8.0-rc1` fall through as "no update".
 */
export function parseReleaseTag(tag: string): ReleaseVersion | null {
  const normalized = tag.startsWith('v') ? tag.slice(1) : tag
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(normalized)
  if (!match) {
    return null
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  }
}

function parseCurrentVersion(version: string): ParsedCurrentVersion | null {
  const normalized = version.startsWith('v') ? version.slice(1) : version
  const match =
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(
      normalized
    )
  if (!match) {
    return null
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null
  }
}

/**
 * True only when `tag` parses as a stable `X.Y.Z` release and is newer than
 * `current`, compared by major, then minor, then patch, then prerelease
 * status (a prerelease `current` such as `1.0.0-beta` is behind stable
 * `v1.0.0`). Equal, lower, or unparseable inputs are treated as no update
 * available.
 */
export function isUpdateAvailable(current: string, tag: string): boolean {
  const currentVersion = parseCurrentVersion(current)
  const latestVersion = parseReleaseTag(tag)
  if (!currentVersion || !latestVersion) {
    return false
  }
  if (latestVersion.major !== currentVersion.major) {
    return latestVersion.major > currentVersion.major
  }
  if (latestVersion.minor !== currentVersion.minor) {
    return latestVersion.minor > currentVersion.minor
  }
  if (latestVersion.patch !== currentVersion.patch) {
    return latestVersion.patch > currentVersion.patch
  }
  return currentVersion.prerelease !== null
}

/**
 * True when `version` parses and carries a `beta` prerelease identifier
 * (e.g. `1.0.0-beta`, `v1.0.0-beta.1`).
 */
export function isBetaVersion(version: string): boolean {
  const parsed = parseCurrentVersion(version)
  return Boolean(
    parsed?.prerelease && /^beta(?:[.-]|$)/i.test(parsed.prerelease)
  )
}
