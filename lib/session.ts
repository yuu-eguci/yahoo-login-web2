// Converts SESSION_MAX_AGE_MS into a cookie maxAge.
// An unset or invalid value means a browser-session cookie instead of an invalid expiry date.
export const parseSessionMaxAge = (value: string | undefined): number | undefined => {
  if (value === undefined || value.trim() === '') {
    return undefined
  }
  const maxAge = Number(value)
  return Number.isFinite(maxAge) ? maxAge : undefined
}
