import { Request, Response } from "express";
import { APP_SCHEME, BASE_URL } from "../../utils/constants";

// This function is called once the user has authenticated with Google
// It handles the callback and redirects back to the app with the authorization code
// This function is called once the user has authenticated with Google (web only)
// It handles the callback for web platforms
export async function callbackGet(req: Request, res: Response) {
  try {
    const incomingParams = new URLSearchParams(req.url.split("?")[1]);
    const state = incomingParams.get("state");

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

    const code = incomingParams.get("code")?.toString() || "";

    // For web platform, return the code and state to the frontend
    // The frontend will handle exchanging this for tokens
    res.setHeader("Content-Type", "text/html");
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
      </head>
      <body>
        <p>Authentication successful! Redirecting...</p>
        <script>
          // Send message to parent window or redirect
          const params = new URLSearchParams({
            code: '${code}',
            state: '${state}'
          });
          window.location.href = '${BASE_URL}?' + params.toString();
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Callback error:", error);
    return res.status(500).json({ error: "Callback processing failed" });
  }
}
