import mongoose from "mongoose"

export type ClosePost = {
  postId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  score: number
}
