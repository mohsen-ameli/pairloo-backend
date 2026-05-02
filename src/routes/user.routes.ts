import { Router } from "express"
import { userProfileGet } from "../controllers/users/user-profile.controller"
import { followUser } from "../controllers/users/follow.controller"
import { unfollowUser } from "../controllers/users/unfollow.controller"
import { reviewUser } from "../controllers/users/review.controller"
import {
  myPostsGet,
  myReviewsGet,
  myUserGet,
  savePost,
  unsavePost,
  getSavedPosts,
  socialGet,
} from "../controllers/users/user.controller"
import { updateExpoPushToken } from "../controllers/users/update-expo-push-token.controller"

const userRoutes = Router()

userRoutes.get("/profile/:id", userProfileGet)
userRoutes.get("/social/:id", socialGet)

userRoutes.get("/my-reviews", myReviewsGet)
userRoutes.get("/my-posts", myPostsGet)
userRoutes.get("/my-user", myUserGet)
userRoutes.get("/my-saved-posts", getSavedPosts)

userRoutes.post("/follow", followUser)
userRoutes.post("/unfollow", unfollowUser)
userRoutes.post("/review", reviewUser)

userRoutes.post("/save-post/:postId", savePost)
userRoutes.delete("/save-post/:postId", unsavePost)

userRoutes.post("/update-expo-push-token", updateExpoPushToken)

export default userRoutes
