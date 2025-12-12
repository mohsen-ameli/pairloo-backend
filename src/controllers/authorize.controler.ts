import { Request, Response } from "express";
import {
  APP_SCHEME,
  BASE_URL,
  GOOGLE_AUTH_URL,
  GOOGLE_CLIENT_ID,
} from "../utils/constants";

// This function proxies the authorization request to Google's OAuth 2.0 authorization endpoint
// For use with expo-auth-session which needs redirect capability
export async function authorizeGet(req: Request, res: Response) {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json(
        { error: "Missing GOOGLE_CLIENT_ID environment variable" }
      );
    }

    const url = new URL(BASE_URL + req.url);
    let idpClientId: string;
    const internalClient = url.searchParams.get("client_id");
    const redirectUri = url.searchParams.get("redirect_uri");

    console.log("Authorize endpoint called with:", {
      redirectUri,
      APP_SCHEME,
      BASE_URL,
      internalClient,
    });

    let platform;
    let finalRedirectUri: string;

    // Determine platform and final redirect URI based on what the client sent
    if (!redirectUri) {
      return res.status(400).json({ error: "Missing redirect_uri" });
    }

    // Use the redirectUri as sent by the client (from expo-auth-session)
    // This is the app's scheme (exp://, matcher://, etc.)
    finalRedirectUri = redirectUri;

    if (
      redirectUri === APP_SCHEME ||
      redirectUri.startsWith("exp://") ||
      redirectUri.startsWith("matcher://")
    ) {
      platform = "mobile";
    } else if (redirectUri === BASE_URL || redirectUri.startsWith("http://localhost") || redirectUri.startsWith("http://127.0.0.1")) {
      platform = "web";
    } else {
      console.log("Invalid redirect_uri received:", redirectUri, "Expected APP_SCHEME:", APP_SCHEME, "or BASE_URL:", BASE_URL);
      return res.status(400).json({ error: "Invalid redirect_uri" });
    }

    // use state to drive redirect back to platform
    let state = url.searchParams.get("state");

    if (internalClient === "google") {
      idpClientId = GOOGLE_CLIENT_ID;
    } else {
      return res.status(400).json({ error: "Invalid client" });
    }

    // additional enforcement
    if (!state) {
      return res.status(400).json({ error: "Invalid state" });
    }

    // For mobile apps, redirect directly to the app with the code
    // For web apps, use the backend callback endpoint
    const callbackUri = platform === "mobile" ? finalRedirectUri : BASE_URL + "/api/auth/callback";

    const params = new URLSearchParams({
      client_id: idpClientId,
      redirect_uri: callbackUri,
      response_type: "code",
      scope: url.searchParams.get("scope") || "openid profile email",
      state,
      prompt: "select_account",
    });

    console.log("Redirecting to Google with params:", {
      client_id: idpClientId,
      redirect_uri: callbackUri,
      state: state.substring(0, 20) + "...",
    });

    return res.redirect(GOOGLE_AUTH_URL + "?" + params.toString());
  } catch (error) {
    console.error("Authorization error:", error);
    return res.status(500).json({ error: "Authorization failed" });
  }
}
