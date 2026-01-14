import mongoose from "mongoose";
import { ClosePost } from "../types/closePost.types";

export interface PostType extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  content: string;
  summary: string;
  images?: string[];
  publicPost: boolean;
  numMatches: number;
  qna: { question: string; answer: string }[];
  embedding: number[];
  closestPosts?: ClosePost[] | null;
  createdAt: Date;
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
        question: { type: String, required: true },
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default postSchema;
