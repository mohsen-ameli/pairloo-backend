import mongoose from "mongoose"
import { S3Object, s3ObjectSchema } from "./s3Object.model"
import { getObject } from "../utils/s3"
import { isSignedUrlExpired } from "../utils/is-signed-url-expired"

export interface MessageType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  conversationId: mongoose.Types.ObjectId
  senderId: mongoose.Types.ObjectId
  content: string
  attachment?: S3Object | null
  createdAt: Date
  updatedAt: Date
}

interface MessageModel extends mongoose.Model<MessageType> {
  updateAttachmentUrls(docs: MessageType[] | MessageType): Promise<void>
}

export const messageSchema = new mongoose.Schema<MessageType, MessageModel>({
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

messageSchema.statics.updateAttachmentUrls = async function updateAttachmentUrls(
  docs: MessageType[] | MessageType
) {
  if (!docs || (docs instanceof Array && docs.length === 0)) return

  if (!(docs instanceof Array)) {
    docs = [docs]
  }

  for (const doc of docs) {
    // If document doesn't have an attachment or the attachment signed URL is still valid, skip
    if (!doc.attachment || !doc.attachment.key || !isSignedUrlExpired(doc.attachment.url)) continue

    const url = await getObject(doc.attachment.key)
    if (!url) continue
    doc.attachment.url = url
    await Message.findByIdAndUpdate(doc._id, { attachment: doc.attachment })
    doc.attachment.url = url
  }
}

messageSchema.pre("save", function () {
  this.updatedAt = new Date()
})

const Message = mongoose.model<MessageType, MessageModel>("message", messageSchema)
export default Message
