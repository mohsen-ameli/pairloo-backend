import { DefaultEventsMap, Namespace, Server, Socket } from "socket.io"
import User from "../models/user.model"
import Conversation from "../models/conversation.model"
import { Types } from "mongoose"
import Message from "../models/message.model"

export function chatSocket(
  io: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) {
  io.on("connection", async (socket: Socket) => {
    const userId = socket.user!.sub
    const user = await User.findById(userId)

    if (!user) {
      socket.emit("error", "User not found")
      socket.disconnect(true)
      console.error("user is not logged in")
      return
    }

    try {
      const conversations = await Conversation.find({
        members: userId,
      }).select("_id")

      conversations.forEach(conversation => {
        socket.join(conversation._id.toString())
      })
    } catch (err: any) {
      console.error("Error joining conversation rooms:", err.message)
      return
    }

    socket.on("disconnect", () => {
      console.log("user disconnected: ", userId)
    })

    socket.on("getConversations", async () => {
      const conversations = await Conversation.find({
        members: userId,
      })
        .populate({
          path: "members",
          select: "username picture email",
        })
        .select("_id members lastMessage")
        .populate<{
          lastMessage: {
            _id: Types.ObjectId
            conversationId: Types.ObjectId
            senderId: {
              _id: Types.ObjectId
              username: string
            }
            content: string
            attachment: string
            createdAt: Date
            updatedAt: Date
          }
        }>({
          path: "lastMessage.senderId",
          select: "_id username",
        })
        .lean()

      const formattedConversations = conversations.map(conv => {
        if (conv.lastMessage && conv.lastMessage.senderId) {
          return {
            ...conv,
            lastMessage: {
              ...conv.lastMessage,
              sender: {
                _id: conv.lastMessage.senderId._id,
                username: conv.lastMessage.senderId.username,
              },
            },
          }
        }
        return conv
      })

      socket.emit("conversations", formattedConversations)
    })

    socket.on("newConversation", async (memberIds: Types.ObjectId[]) => {
      const existingConversation = await Conversation.findOne({
        members: { $all: memberIds },
      })
        .populate({
          path: "members",
          select: "username picture email",
        })
        .lean()
      if (existingConversation) {
        socket.emit("conversation", existingConversation)
        return
      }

      const conversation = await Conversation.create({
        members: memberIds,
        createdBy: userId,
      })

      const connectedSockets = Array.from(io.sockets.values()).filter(s =>
        memberIds.includes(s.user!.sub as unknown as Types.ObjectId)
      )

      connectedSockets.forEach(s => {
        s.join(conversation._id.toString())
      })

      const populatedConversation = await Conversation.findById(conversation._id)
        .populate({
          path: "members",
          select: "username picture email",
        })
        .lean()

      if (!populatedConversation) {
        socket.emit("error", "Conversation not found after creation")
        return
      }

      io.to(conversation._id.toString()).emit("conversation", populatedConversation)
    })

    socket.on(
      "newMessage",
      async ({ conversationId, content }: { conversationId: string; content: string }) => {
        const message = await Message.create({
          conversationId: new Types.ObjectId(conversationId),
          senderId: userId,
          content,
        })

        const populatedMessage = await Message.findById(message._id).populate<{
          senderId: {
            _id: Types.ObjectId
            username: string
            picture: string
          }
        }>({
          path: "senderId",
          select: "username picture",
        })

        if (!populatedMessage) {
          socket.emit("error", "Message not found after creation")
          return
        }

        const formattedMessage = {
          ...populatedMessage.toObject(),
          sender: {
            username: populatedMessage.senderId.username,
            picture: populatedMessage.senderId.picture,
          },
        }

        io.to(conversationId).emit("message", formattedMessage)

        // Update lastMessage in Conversation
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: formattedMessage,
        })

        io.to(conversationId).emit("lastMessageUpdated", conversationId, formattedMessage)
      }
    )

    socket.on("getMessages", async (conversationId: string) => {
      const messages = await Message.find({ conversationId })
        .sort({
          createdAt: 1,
        })
        .populate<{
          senderId: {
            _id: Types.ObjectId
            username: string
            picture?: string
          }
        }>({
          path: "senderId",
          select: "username picture",
        })
        .lean()

      if (messages.length === 0) {
        socket.emit("messages", [])
        return
      }

      const formattedMessages = messages.map(msg => ({
        ...msg,
        sender: {
          username: msg.senderId.username.toString(),
          picture: msg.senderId.picture?.toString(),
        },
      }))

      socket.emit("messages", formattedMessages)
    })

    socket.emit("connected", "You are connected to chat namespace")
  })
}
