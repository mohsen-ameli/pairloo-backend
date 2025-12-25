import { Request, Response } from "express";
import { APP_SCHEME, BASE_URL } from "../../utils/constants";

// This function is called once the user has authenticated with Google
// It handles the callback and redirects back to the app with the authorization code
// This function is called once the user has authenticated with Google (web only)
// It handles the callback for web platforms
export async function callbackGet(req: Request, res: Response) {
  try {
    const incomingParams = new URLSearchParams(req.url.split("?")[1]);
    const combinedPlatformAndState = incomingParams.get("state")!;
    const platform = combinedPlatformAndState.split("|")[0];
    const state = combinedPlatformAndState.split("|")[1];

    if (!state) {
      return res.status(400).json({ error: "Invalid state" });
    }

    // Check for errors from Google
    const error = incomingParams.get("error");
    if (error) {
      console.error(
        "Google OAuth error:",
        error,
        incomingParams.get("error_description")
      );
      return res.status(400).json({
        error: "Google authentication failed",
        details: incomingParams.get("error_description"),
      });
    }

    const outgoingParams = new URLSearchParams({
      code: incomingParams.get("code")?.toString() || "",
      state,
    });

    return res.redirect(
      (platform == "web" ? BASE_URL : APP_SCHEME) +
        "?" +
        outgoingParams.toString()
    );
  } catch (error) {
    console.error("Callback error:", error);
    return res.status(500).json({ error: "Callback processing failed" });
  }
}
