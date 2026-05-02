import { Router } from "express"
import { userProfileGet } from "../controllers/users/user-profile.controller"
import { followUser } from "../controllers/users/follow.controller"
import { unfollowUser } from "../controllers/users/unfollow.controller"
import { reviewUser } from "../controllers/users/review.controller"
import {
  myPostsGet,
  reviewsGet,
  myUserGet,
  savePost,
  unsavePost,
  getSavedPosts,
  socialGet,
} from "../controllers/users/user.controller"
import { updateExpoPushToken } from "../controllers/users/update-expo-push-token.controller"

const userRoutes = Router()

// Shared between user profiles and my profile
userRoutes.get("/social/:id", socialGet)
userRoutes.get("/reviews/:id", reviewsGet)

// Only for my profile
userRoutes.get("/my-posts", myPostsGet)
userRoutes.get("/my-user", myUserGet)
userRoutes.get("/my-saved-posts", getSavedPosts)

// Only for other user profiles
userRoutes.get("/profile/:id", userProfileGet)

userRoutes.post("/follow", followUser)
userRoutes.post("/unfollow", unfollowUser)
userRoutes.post("/review", reviewUser)

userRoutes.post("/save-post/:postId", savePost)
userRoutes.delete("/save-post/:postId", unsavePost)

userRoutes.post("/update-expo-push-token", updateExpoPushToken)

export default userRoutes
