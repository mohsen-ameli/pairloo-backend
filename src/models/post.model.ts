import mongoose from "mongoose"
import { ClosePost } from "../types/closePost.types"
import { Question } from "../types/question.types"

export interface PostType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  content: string
  summary: string
  images?: string[]
  publicPost: boolean
  numMatches: number
  qna: { question: Question; answer: string }[]
  embedding: number[]
  closestPosts?: ClosePost[] | null
  isDraft?: boolean
  createdAt: Date
}

const postSchema = new mongoose.Schema<PostType>({
  content: {
    type: String,
    required: [true, "Post content is required"],
  },
  summary: {
    type: String,
    required: true,
  },
  images: {
    type: [String],
    required: false,
  },
  publicPost: {
    type: Boolean,
    default: false,
  },
  numMatches: {
    type: Number,
    default: 5,
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
        },
        answer: { type: String, required: true },
      },
    ],
    required: true,
  },
  embedding: {
    type: [Number],
    required: true,
  },
  closestPosts: {
    type: [
      {
        score: { type: Number, required: true },
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "post",
          required: true,
        },
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
