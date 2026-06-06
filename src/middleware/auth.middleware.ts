import { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"
import { ACCESS_COOKIE_NAME, JWT_SECRET } from "../utils/constants"
import { JwtPayload } from "../types/user.types"

// Authentication middleware to make sure user is authenticated
// Include this middleware in routes that require authentication
// e.g. app.get("/some-route", authMiddleware, (req, res) => { ... });
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const cookieToken = req.cookies?.[ACCESS_COOKIE_NAME]

  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : cookieToken

  if (!token) {
    return res.status(401).json({ message: "Authentication token missing" })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    req.user = decoded
    next()
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" })
  }
}

export default authMiddleware
