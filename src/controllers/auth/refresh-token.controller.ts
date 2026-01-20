import { Request, Response } from "express"
import * as jose from "jose"
import User from "../../models/user.model"
import createJWT from "../../utils/create-jwt"
import { JWT_SECRET } from "../../utils/constants"

// Get a new access token using a valid refresh token
export async function refreshTokenPost(req: Request, res: Response) {
  const { refreshToken } = req.body
  if (!refreshToken) {
    return res.status(400).json({ error: "Missing refresh token" })
  }

  let payload: jose.JWTVerifyResult
  try {
    payload = await jose.jwtVerify(refreshToken, new TextEncoder().encode(JWT_SECRET))
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired refresh token" })
  }

  if (payload.payload.type !== "refresh") {
    return res.status(401).json({ error: "Invalid token type" })
  }

  const user = await User.findById(payload.payload.sub)
  if (!user) {
    return res.status(404).json({ error: "User not found" })
  }

  const { accessToken } = await createJWT(user._id.toString())

  return res.json({ accessToken })
}
