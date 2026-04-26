import { DefaultEventsMap, Namespace, Socket } from "socket.io"
import User from "../models/user.model"
import Conversation from "../models/conversation.model"
import { Types } from "mongoose"
import Message from "../models/message.model"
import { getObject, sendObject } from "../utils/s3"
import { Attachment } from "../types/attachment.type"
import { sendPushNotification } from "../utils/send-push-notification"

export function chatSocket(
  io: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) {
  io.on("connection", async (socket: Socket) => {
    let connected = false
    const userId = socket.user!.sub
    const user = await User.findById(userId)
    let otherUserPushToken: string | undefined

    if (!user) {
      socket.emit("error", "User not found")
      socket.disconnect(true)
      console.error("user is not logged in")
      return
    }

    const handleSocketEvent = <T extends any[]>(
      eventName: string,
      handler: (...args: T) => Promise<void>
    ) => {
      return async (...args: T) => {
        try {
          await handler(...args)
        } catch (error) {
          console.error(`[chat:${eventName}]`, error)
          socket.emit("error", "Something went wrong. Please try again.")
        }
      }
    }

    const deleteMessageHandler = async (messageId: string, conversationId: string) => {
      const deletedMessage = await Message.findByIdAndDelete(messageId)

      if (!deletedMessage) {
        socket.emit("error", "Message not found")
        return
      }

      // Emit the deleted message event to all users in the conversation
      io.to(conversationId).emit("messageDeleted", {
        messageId,
        conversationId,
      })

      // Find any messages that have a replyTo pointing to this deleted message
      const repliedMessages = await Message.find({
        replyTo: messageId,
        conversationId,
      }).populate<{
        senderId: {
          _id: Types.ObjectId
          username: string
          picture: string
        }
      }>({
        path: "senderId",
        select: "username picture",
      })

      if (repliedMessages.length > 0) {
        for (const msg of repliedMessages) {
          // Clear the replyTo field to mark it as deleted
          await Message.findByIdAndUpdate(msg._id, {
            replyTo: null,
            replyToDeleted: true,
          })

          // Fetch the updated message with all details
          const updatedMessage = await Message.findById(msg._id).populate<{
            senderId: {
              _id: Types.ObjectId
              username: string
              picture: string
            }
          }>({
            path: "senderId",
            select: "username picture",
          })

          if (!updatedMessage) continue

          const attachmentUrls = []
          for (const key of updatedMessage.attachments || []) {
            const url = await getObject(key)
            if (url) attachmentUrls.push(url)
          }

          const formattedMessage = {
            _id: updatedMessage._id,
            conversationId: updatedMessage.conversationId,
            content: updatedMessage.content,
            createdAt: updatedMessage.createdAt,
            updatedAt: updatedMessage.updatedAt,
            attachments: attachmentUrls,
            replyTo: null,
            replyToDeleted: updatedMessage.replyToDeleted || false,
            isEdited: updatedMessage.isEdited || false,
            sender: {
              _id: updatedMessage.senderId._id,
              username: updatedMessage.senderId.username,
              picture: await getObject(updatedMessage.senderId.picture),
            },
          }

          io.to(conversationId).emit("messageUpdated", formattedMessage)
        }
      }
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

    socket.on(
      "disconnect",
      handleSocketEvent("disconnect", async () => {
        console.log("user disconnected: ", userId)
      })
    )

    socket.on(
      "newMessage",
      handleSocketEvent(
        "newMessage",
        async ({
          conversationId,
          content,
          attachments,
          replyTo,
        }: {
          conversationId: string
          content?: string
          attachments?: Attachment[]
          replyTo?: string
        }) => {
          const urls = []
          const keys = []
          if (attachments && attachments.length > 0) {
            for (const attachment of attachments) {
              const fileName = await sendObject("chat", attachment.file, attachment.mimeType)
              if (!fileName) {
                socket.emit("error", "Failed to upload attachment")
                return
              }
              const url = await getObject(fileName)
              urls.push(url)
              keys.push(fileName)
            }
          }

          const messageData = {
            conversationId: new Types.ObjectId(conversationId),
            senderId: userId,
            content,
            attachments: keys,
            replyTo: replyTo ? new Types.ObjectId(replyTo) : undefined,
          }

          const message = await Message.create(messageData)

          const populatedMessage = await Message.findById(message._id)
            .populate<{
              senderId: {
                _id: Types.ObjectId
                username: string
                picture: string
              }
            }>({
              path: "senderId",
              select: "username picture",
            })
            .populate<{
              replyTo: {
                _id: Types.ObjectId
                content: string
                attachments: string[]
                senderId: {
                  _id: Types.ObjectId
                  username: string
                }
              }
            }>({
              path: "replyTo",
              select: "content attachments senderId",
              populate: {
                path: "senderId",
                select: "username",
              },
            })

          if (!populatedMessage) {
            socket.emit("error", "Message not found after creation")
            return
          }

          let replyToData
          if (populatedMessage.replyTo) {
            const replyAttachments = []
            for (const key of populatedMessage.replyTo.attachments) {
              const url = await getObject(key)
              if (url) replyAttachments.push(url)
            }
            replyToData = {
              _id: populatedMessage.replyTo._id,
              content: populatedMessage.replyTo.content,
              attachments: replyAttachments,
              sender: {
                _id: populatedMessage.replyTo.senderId._id,
                username: populatedMessage.replyTo.senderId.username,
              },
            }
          }

          const formattedMessage = {
            _id: populatedMessage._id,
            conversationId: populatedMessage.conversationId,
            content: populatedMessage.content,
            createdAt: populatedMessage.createdAt,
            updatedAt: populatedMessage.updatedAt,
            attachments: urls,
            replyTo: replyToData,
            replyToDeleted: populatedMessage.replyToDeleted || false,
            isEdited: populatedMessage.isEdited || false,
            sender: {
              _id: populatedMessage.senderId._id,
              username: populatedMessage.senderId.username,
              picture: await getObject(populatedMessage.senderId.picture),
            },
          }

          io.to(conversationId).emit("message", formattedMessage)

          // Update lastMessage in Conversation
          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: {
              conversationId: populatedMessage.conversationId,
              senderId: populatedMessage.senderId._id,
              content: populatedMessage.content,
              attachments: keys,
              createdAt: populatedMessage.createdAt,
              updatedAt: populatedMessage.updatedAt,
            },
          })

          if (otherUserPushToken) {
            await sendPushNotification(
              otherUserPushToken,
              populatedMessage.senderId.username,
              content ? content : "Sent an attachment"
            )
          }
        }
      )
    )

    socket.on(
      "getConversations",
      handleSocketEvent("getConversations", async () => {
        const conversations = await Conversation.find({
          members: userId,
        })
          .populate<{
            members: {
              _id: Types.ObjectId
              username: string
              picture: string
              email: string
            }[]
          }>({
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

        await User.updateUserPicture(conversations.flatMap(conv => conv.members))

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
    )

    socket.on(
      "newConversation",
      handleSocketEvent("newConversation", async (memberIds: Types.ObjectId[]) => {
        const existingConversation = await Conversation.findOne({
          members: { $all: memberIds },
        })
          .populate<{
            members: {
              _id: Types.ObjectId
              username: string
              picture: string
              email: string
            }[]
          }>({
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
        })

        const connectedSockets = Array.from(io.sockets.values()).filter(s =>
          memberIds.includes(s.user!.sub as unknown as Types.ObjectId)
        )

        connectedSockets.forEach(s => {
          s.join(conversation._id.toString())
        })

        const populatedConversation = await Conversation.findById(conversation._id)
          .populate<{
            members: {
              _id: Types.ObjectId
              username: string
              picture: string
              email: string
            }[]
          }>({
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
    )

    socket.on(
      "getMessages",
      handleSocketEvent(
        "getMessages",
        async (conversationId: string, start: number, end: number) => {
          const skip = Math.max(0, start)
          const limit = Math.max(0, end - start)

          if (limit === 0) {
            socket.emit("messages", [])
            return
          }

          const messages = await Message.find({ conversationId })
            .sort({
              createdAt: -1,
            })
            .skip(skip)
            .limit(limit)
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
            .populate<{
              replyTo: {
                _id: Types.ObjectId
                content: string
                attachments: string[]
                senderId: {
                  _id: Types.ObjectId
                  username: string
                }
              }
            }>({
              path: "replyTo",
              select: "content attachments senderId",
              populate: {
                path: "senderId",
                select: "username",
              },
            })
            .lean()

          if (messages.length === 0) {
            socket.emit("messages", [])
            return
          }

          const conversation = await Conversation.findById(conversationId).select("members").lean()
          const otherMemberId = conversation?.members.find(
            memberId => memberId.toString() !== userId
          )

          if (otherMemberId) {
            const otherUser = await User.findById(otherMemberId).select("expoPushToken").lean()
            otherUserPushToken = otherUser?.expoPushToken
          }

          const map = new Map<string, string>()

          const formattedMessages = []
          for (const msg of messages) {
            const attachments = []
            for (const key of msg.attachments || []) {
              const url = await getObject(key)
              if (url) {
                attachments.push(url)
              }
            }

            if (msg.senderId.picture) {
              if (map.has(msg.senderId.picture)) {
                msg.senderId.picture = map.get(msg.senderId.picture)!
              } else {
                const url = await getObject(msg.senderId.picture)
                if (url) {
                  msg.senderId.picture = url
                  map.set(msg.senderId.picture, url)
                }
              }
            }

            let replyToData
            if (msg.replyTo) {
              const replyAttachments = []
              for (const key of msg.replyTo.attachments || []) {
                const url = await getObject(key)
                if (url) replyAttachments.push(url)
              }
              replyToData = {
                _id: msg.replyTo._id,
                content: msg.replyTo.content,
                attachments: replyAttachments,
                sender: {
                  _id: msg.replyTo.senderId._id,
                  username: msg.replyTo.senderId.username,
                },
              }
            }

            formattedMessages.push({
              _id: msg._id,
              conversationId: msg.conversationId,
              content: msg.content,
              createdAt: msg.createdAt,
              updatedAt: msg.updatedAt,
              attachments,
              replyTo: replyToData,
              replyToDeleted: msg.replyToDeleted || false,
              isEdited: msg.isEdited || false,
              sender: {
                _id: msg.senderId._id,
                username: msg.senderId.username.toString(),
                picture: msg.senderId.picture,
              },
            })
          }

          socket.emit("messages", formattedMessages)
        }
      )
    )

    socket.on(
      "editMessage",
      handleSocketEvent(
        "editMessage",
        async ({
          messageId,
          conversationId,
          newContent,
        }: {
          messageId: string
          conversationId: string
          newContent: string
        }) => {
          // If the new content is empty, use the delete message handler
          if (!newContent || !newContent.trim()) {
            await deleteMessageHandler(messageId, conversationId)
            return
          }

          // Update the message
          const updatedMessage = await Message.findByIdAndUpdate(
            messageId,
            { content: newContent, isEdited: true, updatedAt: new Date() },
            { new: true }
          )

          if (!updatedMessage) {
            socket.emit("error", "Message not found")
            return
          }

          // Emit confirmation with the new content so replies can be updated
          io.to(conversationId).emit("messageEdited", {
            messageId: updatedMessage._id,
            conversationId: updatedMessage.conversationId,
            updatedAt: updatedMessage.updatedAt,
            content: updatedMessage.content,
          })
        }
      )
    )

    socket.on(
      "deleteMessage",
      handleSocketEvent(
        "deleteMessage",
        async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
          await deleteMessageHandler(messageId, conversationId)
        }
      )
    )

    if (!connected) {
      socket.emit("connected", () => {
        console.log("user connected: ", userId)
        return "You are connected to chat namespace"
      })
      connected = true
    }
  })
}
