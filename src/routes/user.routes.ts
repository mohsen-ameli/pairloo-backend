import { Router } from "express"
import { userProfileGet } from "../controllers/users/user-profile.controller"
import { followUser } from "../controllers/users/follow.controller"
import { unfollowUser } from "../controllers/users/unfollow.controller"

const userRoutes = Router()

userRoutes.get("/profile/:id", userProfileGet)
userRoutes.post("/follow", followUser)
userRoutes.post("/unfollow", unfollowUser)

export default userRoutes
