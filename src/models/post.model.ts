import mongoose from "mongoose"
import { ClosePost } from "../types/closePost.types"
import { QnaType } from "../types/session.types"
import { LocationType } from "../types/location.type"
import { getObject } from "../utils/s3"

export interface PostType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  title: string
  description: string
  needSummary: string
  provideSummary: string
  generalSummary: string
  location?: LocationType
  distance?: number
  images?: string[]
  publicPost: boolean
  qna: QnaType
  closestPosts: ClosePost[]
  isDraft?: boolean
  createdAt: Date
}

type PostImagesTarget = Pick<PostType, "images">

interface PostModel extends mongoose.Model<PostType> {
  updatePostImages(post: PostImagesTarget): Promise<void>
}

const postSchema = new mongoose.Schema<PostType>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  title: {
    type: String,
    required: [true, "Post title is required"],
  },
  description: {
    type: String,
    required: [true, "Post description is required"],
  },
  needSummary: {
    type: String,
    required: true,
    default: "",
  },
  provideSummary: {
    type: String,
    required: true,
    default: "",
  },
  generalSummary: {
    type: String,
    required: true,
  },
  location: {
    type: {
      longitude: { type: Number, required: true },
      latitude: { type: Number, required: true },
    },
    required: false,
  },
  distance: {
    type: Number,
    required: false,
  },
  images: {
    type: [String],
    required: false,
  },
  publicPost: {
    type: Boolean,
    default: false,
  },
  qna: {
    type: [
      {
        question: {
          type: {
            type: String,
            enum: ["short_answer", "multiple_choice", "multi_select"],
            required: true,
          },
          question: { type: String, required: true },
          options: { type: [String], required: false },
          optional: { type: Boolean, required: false },
          intention: { type: String, required: false },
        },
        answer: { type: [String], required: true },
      },
    ],
    required: true,
  },
  closestPosts: {
    type: [
      {
        score: { type: Number, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, required: true },
        postId: { type: mongoose.Schema.Types.ObjectId, required: true },
      },
    ],
    required: false,
    default: [],
  },
  isDraft: {
    type: Boolean,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Update the user's post images with new signed URLs if expired
postSchema.statics.updatePostImages = async function (post: PostImagesTarget) {
  if (!post || !post.images || post.images.length === 0) return post

  const newImages = []

  for (let image of post.images) {
    if (!image) continue

    const url = await getObject(image)
    if (!url) continue
    newImages.push(url)
  }

  post.images = newImages
}

const Post = mongoose.model<PostType, PostModel>("post", postSchema)
export { postSchema }
export default Post
