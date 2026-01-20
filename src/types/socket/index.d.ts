import { Socket } from "socket.io"
import { JwtPayload } from "./user.types"

declare module "socket.io" {
  interface Socket {
    user?: JwtPayload
  }
}
