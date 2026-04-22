import mongoose from "mongoose"
import { ClosePost } from "../types/closePost.types"
import { QnaType } from "../types/session.types"
import { LocationType } from "../types/location.type"

export interface PostType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  postId: mongoose.Types.ObjectId
  title: string
  description: string
  needSummary: string
  provideSummary: string
  location?: LocationType
  distance?: number
  images?: string[]
  publicPost: boolean
  qna: QnaType
  closestPosts?: ClosePost[] | null
  isDraft?: boolean
  createdAt: Date
}

const postSchema = new mongoose.Schema<PostType>({
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

export default postSchema
