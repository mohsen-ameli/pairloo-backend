import { Request, Response } from "express";
import {
  APP_SCHEME,
  BASE_URL,
  GOOGLE_AUTH_URL,
  GOOGLE_CLIENT_ID,
} from "../utils/constants";

export async function authorizeGet(req: Request, res: Response) {
  if (!GOOGLE_CLIENT_ID) {
    return Response.json(
      { error: "Missing GOOGLE_CLIENT_ID environment variable" },
      { status: 500 }
    );
  }

  const url = new URL(BASE_URL + req.url);
  let idpClientId: string;
  const internalClient = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");

  // let platform;

  // if (redirectUri === APP_SCHEME) {
  //   platform = "mobile";
  // } else if (redirectUri === BASE_URL) {
  //   platform = "web";
  // } else {
  //   return Response.json({ error: "Invalid redirect_uri" }, { status: 400 });
  // }
  const platform = "mobile";

  // use state to drive redirect back to platform
  let state = platform + "|" + url.searchParams.get("state");

  if (internalClient === "google") {
    idpClientId = GOOGLE_CLIENT_ID;
  } else {
    return Response.json({ error: "Invalid client" }, { status: 400 });
  }

  // additional enforcement
  if (!state) {
    return Response.json({ error: "Invalid state" }, { status: 400 });
  }

  const params = new URLSearchParams({
    client_id: idpClientId,
    redirect_uri: BASE_URL + "/api/auth/callback",
    response_type: "code",
    scope: url.searchParams.get("scope") || "identity",
    state,
    prompt: "select_account",
  });

  return res.redirect(GOOGLE_AUTH_URL + "?" + params.toString());
}

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

  console.log(outgoingParams);

  return res.redirect("matchmaker://");

  // return res.redirect("matcher://index" + "?" + outgoingParams.toString());
}

export async function tokenPost(req: Request, res: Response) {}
