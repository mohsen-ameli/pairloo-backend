import * as jose from "jose";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  COOKIE_MAX_AGE,
  JWT_EXPIRATION_TIME,
  JWT_SECRET,
  COOKIE_OPTIONS,
  REFRESH_TOKEN_EXPIRY,
  REFRESH_COOKIE_OPTIONS,
} from "../utils/constants";
import { Request, Response } from "express";
import User from "../models/user.model";

// Exchanges authorization code for tokens and user info
export async function tokenPost(req: Request, res: Response) {
  console.log(req.body);
  const code = req.body.code as string;
  const platform = (req.body.platform as string) || "native"; // Default to native if not specified

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
      code: code,
    }),
  });

  const data = await response.json();

  if (!data.id_token) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const userInfo = jose.decodeJwt(data.id_token) as any;

  const user = await User.findOne({
    email: userInfo.email,
  });

  if (!user) {
    return res.status(404).json({
      error:
        "Sorry this gmail account is not associated with an active account.",
    });
  }

  // Update user picture if not set
  if (!user.picture) {
    user.picture = userInfo.picture;
    await user.save();
  }

  // Create a new object without the exp property from the original token
  const { exp, ...userInfoWithoutExp } = userInfo;

  // Current timestamp in seconds
  const issuedAt = Math.floor(Date.now() / 1000);

  // Create access token (short-lived)
  const accessToken = await new jose.SignJWT(userInfoWithoutExp)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(JWT_EXPIRATION_TIME)
    .setSubject(user.id.toString())
    .setIssuedAt(issuedAt)
    .sign(new TextEncoder().encode(JWT_SECRET));

  // Create refresh token (long-lived)
  const refreshToken = await new jose.SignJWT({
    sub: user.id.toString(),
    jti: crypto.randomUUID(),
    type: "refresh",
    // Include all user information in the refresh token
    // This ensures we have the data when refreshing tokens
    email: userInfo.email,
    picture: userInfo.picture,
    email_verified: userInfo.email_verified,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .setIssuedAt(issuedAt)
    .sign(new TextEncoder().encode(JWT_SECRET));

  if (data.error) {
    return res.status(400).json({
      error: data.error,
      error_description: data.error_description,
      message:
        "OAuth validation error - please ensure the app complies with Google's OAuth 2.0 policy",
    });
  }

  // Handle web platform with cookies
  if (platform === "web") {
    // Set the access token in an HTTP-only cookie
    res.cookie(COOKIE_NAME, accessToken, {
      maxAge: COOKIE_OPTIONS.maxAge,
      httpOnly: COOKIE_OPTIONS.httpOnly,
      secure: COOKIE_OPTIONS.secure,
      sameSite: "lax",
      path: COOKIE_OPTIONS.path,
    });

    // Set the refresh token in a separate HTTP-only cookie
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      maxAge: REFRESH_COOKIE_OPTIONS.maxAge,
      httpOnly: REFRESH_COOKIE_OPTIONS.httpOnly,
      secure: REFRESH_COOKIE_OPTIONS.secure,
      sameSite: "lax",
      path: REFRESH_COOKIE_OPTIONS.path,
    });

    // Send a response with success and token metadata
    return res.json({
      success: true,
      issuedAt: issuedAt,
      expiresAt: issuedAt + COOKIE_MAX_AGE,
    });
  }

  // For native platforms, return both tokens in the response body
  return res.json({
    accessToken,
    refreshToken,
  });
}
