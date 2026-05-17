import { Types } from "mongoose"
import { ContactedPost, LastMessageType } from "../models/conversation.model"
import { ReplyTo } from "../models/message.model"

export type ConversationMessagesType = {
  _id: Types.ObjectId
  conversationId: Types.ObjectId
  content: string
  createdAt: Date
  updatedAt: Date
  attachments: string[]
  replyTo: ReplyTo
  replyToDeleted: boolean
  isEdited: boolean
  sender: {
    _id: Types.ObjectId
    username: string
    picture: string
  }
}

export type AllConversationsType = {
  _id: Types.ObjectId
  members: {
    _id: Types.ObjectId
    username: string
    picture: string
  }[]
  contactedPosts: ContactedPost[]
  lastMessage?: LastMessageType
}
