// Source - https://stackoverflow.com/a
// Posted by Gus Bus, modified by community. See post 'Timeline' for change history
// Retrieved 2026-01-29, License - CC BY-SA 4.0

import { parseISO, addSeconds } from "date-fns"

export function isSignedUrlExpired(signedUrl: string): boolean {
  // get the query params: https://stackoverflow.com/a/901144/9362404
  const params = new URLSearchParams(signedUrl)
  const creationDate = parseISO(params.get("X-Amz-Date")!)
  const expiresInSecs = Number(params.get("X-Amz-Expires"))

  const expiryDate = addSeconds(creationDate, expiresInSecs)
  const isExpired = expiryDate < new Date()

  return isExpired
}
