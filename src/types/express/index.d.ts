import { JwtPayload } from "../user.types"

declare module "express-serve-static-core" {
  interface Request {
    user?: JwtPayload
  }
  interface Response {}
}
