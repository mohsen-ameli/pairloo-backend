import * as jose from "jose";
import {
  JWT_EXPIRATION_TIME,
  JWT_SECRET,
  REFRESH_TOKEN_EXPIRY,
} from "../utils/constants";

export default async function createJWT(id: string) {
  // Current timestamp in seconds
  const issuedAt = Math.floor(Date.now() / 1000);

  // Create access token (short-lived)
  const accessToken = await new jose.SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(JWT_EXPIRATION_TIME)
    .setSubject(id)
    .setIssuedAt(issuedAt)
    .sign(new TextEncoder().encode(JWT_SECRET));

  // Create refresh token (long-lived)
  const refreshToken = await new jose.SignJWT({
    sub: id,
    jti: crypto.randomUUID(),
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .setIssuedAt(issuedAt)
    .sign(new TextEncoder().encode(JWT_SECRET));

  return { accessToken, refreshToken };
}
