import { Router } from "express"
import { userProfileGet } from "../controllers/users/user-profile.controller"
import { followUser } from "../controllers/users/follow.controller"
import { unfollowUser } from "../controllers/users/unfollow.controller"
import { reviewUser } from "../controllers/users/review.controller"
import { userGet } from "../controllers/users/user.controller"

const userRoutes = Router()

userRoutes.get("/profile/:id", userProfileGet)
userRoutes.get("/user", userGet)
userRoutes.post("/follow", followUser)
userRoutes.post("/unfollow", unfollowUser)
userRoutes.post("/review", reviewUser)

export default userRoutes
