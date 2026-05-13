import mongoose from "mongoose"

export type SenderType = {
  _id: mongoose.Types.ObjectId
  username: string
}

export type ReplyTo =
  | null
  | undefined
  | {
      _id: mongoose.Types.ObjectId
      content?: string
      attachmentsCount: number
      sender: SenderType
      createdAt: Date
      updatedAt: Date
    }

export interface MessageType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  conversationId: mongoose.Types.ObjectId
  postId: mongoose.Types.ObjectId
  sender: {
    _id: mongoose.Types.ObjectId
    username: string
    picture?: string | null
  }
  content: string
  attachments?: string[]
  replyTo?: ReplyTo
  replyToDeleted?: boolean
  isEdited?: boolean
  createdAt: Date
  updatedAt: Date
}

export const messageSchema = new mongoose.Schema<MessageType>({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "conversation",
    required: true,
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "post",
    required: false,
  },
  sender: {
    type: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
      username: { type: String, required: true },
      picture: { type: String, default: null },
    },
    required: true,
  },
  content: {
    type: String,
  },
  attachments: {
    type: [String],
  },
  replyTo: {
    type: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "message", required: true },
      content: { type: String, required: false },
      attachmentsCount: { type: Number, required: true },
      sender: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
        username: { type: String, required: true },
      },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  replyToDeleted: {
    type: Boolean,
    default: false,
  },
  isEdited: {
    type: Boolean,
    default: false,
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

messageSchema.pre("save", function () {
  this.updatedAt = new Date()
})

const Message = mongoose.model<MessageType>("message", messageSchema)
export default Message
