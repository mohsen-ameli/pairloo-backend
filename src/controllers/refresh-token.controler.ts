import { Request, Response } from "express";
import * as jose from "jose";
import { JWT_EXPIRATION_TIME, JWT_SECRET } from "../utils/constants";
import User from "../models/user.model";

// Get a new access token using a valid refresh token
export async function refreshTokenPost(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Missing refresh token" });
  }

  let payload: jose.JWTVerifyResult;
  try {
    payload = await jose.jwtVerify(
      refreshToken,
      new TextEncoder().encode(JWT_SECRET)
    );
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  if (payload.payload.type !== "refresh") {
    return res.status(401).json({ error: "Invalid token type" });
  }

  const user = await User.findById(payload.payload.sub);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Create new access token
  const { exp, ...userInfoWithoutExp } = {
    ...payload.payload,
    id: user._id.toString(),
  };
  const accessToken = await new jose.SignJWT(userInfoWithoutExp)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(JWT_EXPIRATION_TIME)
    .setSubject(user._id.toString())
    .setIssuedAt()
    .sign(new TextEncoder().encode(JWT_SECRET));

  return res.json({ accessToken });
}
