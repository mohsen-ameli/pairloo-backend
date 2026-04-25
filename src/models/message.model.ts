import mongoose from "mongoose"

export interface MessageType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  conversationId: mongoose.Types.ObjectId
  senderId: mongoose.Types.ObjectId
  content: string
  attachments?: string[]
  replyTo?: mongoose.Types.ObjectId
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
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  content: {
    type: String,
  },
  attachments: {
    type: [String],
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "message",
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
