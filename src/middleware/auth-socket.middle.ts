import { Socket } from "socket.io"
import { ACCESS_COOKIE_NAME, JWT_SECRET } from "../utils/constants"
import jwt from "jsonwebtoken"
import { JwtPayload } from "../types/user.types"

export function authSocketMiddleware(socket: Socket, next: (err?: Error) => void) {
  let token: string | null = null

  // Try to read cookie token (web only)
  const cookieHeader = socket.handshake.headers.cookie

  if (cookieHeader) {
    const cookies = cookieHeader
      ? cookieHeader.split(";").reduce(
          (acc, cookie) => {
            const [k, ...v] = cookie.trim().split("=")
            acc[k.trim()] = decodeURIComponent(v.join("="))
            return acc
          },
          {} as Record<string, string>
        )
      : {}
    token = cookies[ACCESS_COOKIE_NAME]
  } else {
    // Try to get the token (native only)
    token = socket.handshake.auth?.token
  }

  if (!token) return next(new Error("Authentication error"))

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    socket.user = decoded
    next()
  } catch (err) {
    next(new Error("Authentication error"))
  }
}
