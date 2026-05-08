import { DefaultEventsMap, Namespace, Server } from "socket.io"
import { Attachment } from "../attachment.type"
import { AllConversationsType, ConversationMessagesType } from "../conversation.type"
import { Types } from "mongoose"
import { MessageType, ReplyTo } from "../../models/message.model"
import { LastMessageType } from "../../models/conversation.model"

// THIS FILE SHOULD BE KEPT IN SYNC WITH THE FRONTEND

interface ServerToClientEvents {
  conversation: (data: AllConversationsType) => void
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
  connected: (data: string) => void
}

interface ClientToServerEvents {
  newMessage: (data: {
    conversationId: string
    content: string
    attachments?: Attachment[]
    replyTo?: ReplyTo
  }) => void
  getConversations: () => void
  newConversation: (memberIds: Types.ObjectId[]) => void
  getMessages: (conversationId: string, start: number, end: number) => void
  editMessage: (data: { messageId: string; conversationId: string; newContent: string }) => void
  deleteMessage: (data: { messageId: string; conversationId: string }) => void
}

export type ServerSocket = Server<DefaultEventsMap, ClientToServerEvents, ServerToClientEvents, any>

export type CustomSocket = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  any
>
