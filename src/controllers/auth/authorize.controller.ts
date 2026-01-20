import { Request, Response } from "express"
import { APP_SCHEME, BASE_URL, GOOGLE_AUTH_URL, GOOGLE_CLIENT_ID } from "../../utils/constants"

// This function proxies the authorization request to Google's OAuth 2.0 authorization endpoint
// For use with expo-auth-session which needs redirect capability
export async function authorizeGet(req: Request, res: Response) {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: "Missing GOOGLE_CLIENT_ID environment variable" })
    }

    const url = new URL(BASE_URL + req.url)
    let idpClientId: string
    const internalClient = url.searchParams.get("client_id")
    const redirectUri = url.searchParams.get("redirect_uri")

    let platform

    // Determine platform and final redirect URI based on what the client sent
    if (!redirectUri) {
      return res.status(400).json({ error: "Missing redirect_uri" })
    }

    if (redirectUri === APP_SCHEME) {
      platform = "mobile"
    } else if (redirectUri === BASE_URL) {
      platform = "web"
    } else {
      return res.status(400).json({ error: "Invalid redirect_uri" })
    }

    // use state to drive redirect back to platform
    let state = platform + "|" + url.searchParams.get("state")

    if (internalClient === "google") {
      idpClientId = GOOGLE_CLIENT_ID
    } else {
      return res.status(400).json({ error: "Invalid client" })
    }

    // additional enforcement
    if (!state) {
      return res.status(400).json({ error: "Invalid state" })
    }

    const params = new URLSearchParams({
      client_id: idpClientId,
      redirect_uri: BASE_URL + "/api/auth/callback",
      response_type: "code",
      scope: url.searchParams.get("scope") || "identity",
      state,
      prompt: "select_account",
    })

    return res.redirect(GOOGLE_AUTH_URL + "?" + params.toString())
  } catch (error) {
    console.error("Authorization error:", error)
    return res.status(500).json({ error: "Authorization failed" })
  }
}
