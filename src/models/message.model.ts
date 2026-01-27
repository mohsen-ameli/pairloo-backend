import mongoose from "mongoose"
import { S3Object, s3ObjectSchema } from "./s3Object.model"
import { getObject } from "../utils/s3"
import { S3_EXPIRES_IN_SECONDS } from "../utils/constants"

export interface MessageType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  conversationId: mongoose.Types.ObjectId
  senderId: mongoose.Types.ObjectId
  content: string
  attachment?: S3Object | null
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
  attachment: {
    type: s3ObjectSchema,
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

messageSchema.post("find", async function (docs: MessageType[]) {
  for (const doc of docs) {
    // If document doesn't have an attachment or the attachment signed URL is still valid, skip
    if (
      !doc.attachment ||
      !doc.attachment.key ||
      (doc.attachment.url &&
        Date.now() - new Date(doc.attachment.createdAt).getTime() < 1000 * S3_EXPIRES_IN_SECONDS)
    )
      continue

    const url = await getObject(doc.attachment.key)
    if (!url) continue
    doc.attachment.url = url
    doc.attachment.createdAt = new Date()
    await Message.findByIdAndUpdate(doc._id, { attachment: doc.attachment })
  }
})

const Message = mongoose.model<MessageType>("message", messageSchema)
export default Message
