import mongoose from "mongoose"
import { SenderType } from "./message.model"

export type ContactedPost = {
  postId: mongoose.Types.ObjectId
  title: string
  isDeleted: boolean
}

export type LastMessageType =
  | null
  | undefined
  | {
      _id: mongoose.Types.ObjectId
      sender: SenderType
      postId?: mongoose.Types.ObjectId
      content: string
      attachmentsCount: number
      createdAt: Date
      updatedAt: Date
    }

export interface ConversationType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  members: mongoose.Types.ObjectId[]
  contactedPosts: ContactedPost[]
  lastMessage?: LastMessageType
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const conversationSchema = new mongoose.Schema<ConversationType>({
  members: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "user",
    required: true,
  },
  contactedPosts: {
    type: [
      {
        postId: { type: mongoose.Schema.Types.ObjectId, ref: "post" },
        title: { type: String },
        isDeleted: { type: Boolean, default: false },
      },
    ],
    default: [],
  },
  lastMessage: {
    type: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "message" },
      sender: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        username: { type: String },
      },
      postId: { type: mongoose.Schema.Types.ObjectId, ref: "post" },
      content: { type: String },
      attachmentsCount: { type: Number },
      createdAt: { type: Date },
      updatedAt: { type: Date },
    },
    required: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

conversationSchema.pre("save", function () {
  this.updatedAt = new Date()
})

const Conversation = mongoose.model<ConversationType>("conversation", conversationSchema)
export default Conversation
