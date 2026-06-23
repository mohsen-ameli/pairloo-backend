import mongoose from "mongoose"
import { ClosePost } from "../types/closePost.types"
import { QnaType } from "../types/session.types"
import { LocationType } from "../types/location.type"
import { deleteObject, getObject } from "../utils/s3"
import { weaviateClient } from "../server"
import { generateUuid5 } from "weaviate-client"

export type StatusType = "active" | "inactive" | "hidden" | "draft"
export const VALID_STATUSES: StatusType[] = ["active", "inactive", "hidden", "draft"]

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
  status: StatusType
  createdAt: Date
}

type PostImagesTarget = Pick<PostType, "images">

interface PostModel extends mongoose.Model<PostType> {
  updatePostImages(post: PostImagesTarget, inPlace?: boolean): Promise<string[] | void>
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
    required: false,
  },
  provideSummary: {
    type: String,
    required: false,
  },
  generalSummary: {
    type: String,
    required: false,
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
  status: {
    type: String,
    enum: VALID_STATUSES,
    default: "active",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Update the user's post images with new signed URLs if expired
postSchema.statics.updatePostImages = async function (post: PostImagesTarget, inPlace = true) {
  if (!post || !post.images || post.images.length === 0) return post

  const newImages = []

  for (let image of post.images) {
    if (!image) continue

    const url = await getObject(image)
    if (!url) continue
    newImages.push(url)
  }

  if (!inPlace) {
    return newImages
  }
  post.images = newImages
}

// delete attachments from S3 when a message is deleted
postSchema.pre("deleteOne", { document: false, query: true }, async function () {
  if (!weaviateClient) {
    throw new Error("Weaviate client is not initialized")
  }

  const docToUpdate = (await this.model.findOne(this.getQuery())) as PostType

  const weaviatePosts = weaviateClient.collections.use("Post")
  await weaviatePosts.data.deleteById(generateUuid5(docToUpdate._id.toString()))

  for (const attachment of docToUpdate.images || []) {
    await deleteObject(attachment)
  }
})

postSchema.pre("deleteMany", { document: false, query: true }, async function () {
  if (!weaviateClient) {
    throw new Error("Weaviate client is not initialized")
  }

  const docToUpdate = (await this.model.find(this.getQuery())) as PostType[]

  const weaviatePosts = weaviateClient.collections.use("Post")

  for (const doc of docToUpdate) {
    await weaviatePosts.data.deleteById(generateUuid5(doc._id.toString()))
    for (const attachment of doc.images || []) {
      await deleteObject(attachment)
    }
  }
})

postSchema.pre("findOneAndDelete", { document: false, query: true }, async function () {
  if (!weaviateClient) {
    throw new Error("Weaviate client is not initialized")
  }

  const docToUpdate = (await this.model.findOne(this.getQuery())) as PostType

  const weaviatePosts = weaviateClient.collections.use("Post")
  await weaviatePosts.data.deleteById(generateUuid5(docToUpdate._id.toString()))

  for (const attachment of docToUpdate.images || []) {
    await deleteObject(attachment)
  }
})

const Post = mongoose.model<PostType, PostModel>("post", postSchema)
export { postSchema }
export default Post
