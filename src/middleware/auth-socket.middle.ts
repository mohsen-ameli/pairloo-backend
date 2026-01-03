import { Socket } from "socket.io";
import { JWT_SECRET } from "../utils/constants";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/user.types";

export function authSocketMiddleware(
  socket: Socket,
  next: (err?: Error) => void
) {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (socket as any).user = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
}
