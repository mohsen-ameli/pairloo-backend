import { DefaultEventsMap, Namespace } from "socket.io"
import { Attachment } from "../attachment.type"
import { AllConversationsType, ConversationMessagesType } from "../conversation.type"
import { Types } from "mongoose"
import { MessageType, ReplyTo } from "../../models/message.model"
import { LastMessageType } from "../../models/conversation.model"

// THIS FILE SHOULD BE KEPT IN SYNC WITH THE FRONTEND

interface ServerToClientEvents {
  conversation: (initiatorId: string, conversation: AllConversationsType, postId?: string) => void
  error: (message: string) => void
  messages: (data: ConversationMessagesType[]) => void
  messageEdited: (data: {
    messageId: Types.ObjectId
    conversationId: Types.ObjectId
    updatedAt: Date
    content: string
  }) => void
  conversations: (data: AllConversationsType[]) => void
  messageDeleted: (data: { messageId: string; newLastMessage: LastMessageType }) => void
  message: (data: MessageType) => void
  typing: (data: {
    userId: string
    conversationId: string
    postId?: string | null
    isTyping: boolean
  }) => void
  connected: () => void
}

interface ClientToServerEvents {
  newMessage: (data: {
    conversationId: string
    postId?: string | null
    content: string
    attachments?: Attachment[]
    replyTo?: ReplyTo
  }) => void
  getConversations: () => void
  getConversation: (
    initiatorId: string,
    memberIds: Types.ObjectId[],
    postId?: Types.ObjectId
  ) => void
  getMessages: (data: {
    conversationId: string
    postId?: string
    start: number
    end: number
  }) => void
  editMessage: (data: { messageId: string; conversationId: string; newContent: string }) => void
  deleteMessage: (data: { messageId: string; conversationId: string }) => void
  isTyping: (data: { conversationId: string; postId?: string | null; status: boolean }) => void
}

export type ChatSocket = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  any
>
