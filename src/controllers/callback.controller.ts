import { Request, Response } from "express";
import { APP_SCHEME, BASE_URL } from "../utils/constants";

// This function is called once the user has authenticated with Google
// It handles the callback and redirects back to the app with the authorization code
export async function callbackGet(req: Request, res: Response) {
  const incomingParams = new URLSearchParams(req.url.split("?")[1]);
  const combinedPlatformAndState = incomingParams.get("state");
  if (!combinedPlatformAndState) {
    return Response.json({ error: "Invalid state" }, { status: 400 });
  }

  // strip platform to return state as it was set on the client
  const platform = combinedPlatformAndState.split("|")[0];
  const state = combinedPlatformAndState.split("|")[1];

  const outgoingParams = new URLSearchParams({
    code: incomingParams.get("code")?.toString() || "",
    state,
  });

  return res.redirect(
    (platform == "web" ? BASE_URL : APP_SCHEME) +
      "?" +
      outgoingParams.toString()
  );
}
