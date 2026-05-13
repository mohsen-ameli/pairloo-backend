import User from "../models/user.model"
import Conversation, { LastMessageType } from "../models/conversation.model"
import { Types } from "mongoose"
import Message from "../models/message.model"
import { deleteObject, getObject, sendObject } from "../utils/s3"
import { sendPushNotification } from "../utils/send-push-notification"
import { ChatSocket } from "../types/socket/chat-socket.type"
import { AllConversationsType, ConversationMessagesType } from "../types/conversation.type"

export function chatSocket(io: ChatSocket) {
  io.on("connection", async socket => {
    let connected = false
    const userId = socket.user!.sub
    const user = await User.findById(userId)
    let otherUserPushToken: string | undefined
    let otherMemberId: Types.ObjectId | undefined

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

    async function updateLastMessage(conversationId: string) {
      const lastMessage = await Message.findOne({ conversationId })
        .sort({ createdAt: -1 })
        .select("_id sender content attachments createdAt updatedAt")
        .lean()

      const newLastMessage: LastMessageType = lastMessage
        ? {
            _id: lastMessage._id,
            sender: lastMessage.sender,
            content: lastMessage.content,
            attachmentsCount: lastMessage.attachments?.length || 0,
            createdAt: lastMessage.createdAt,
            updatedAt: lastMessage.updatedAt,
          }
        : null

      await Conversation.findByIdAndUpdate(conversationId, { lastMessage: newLastMessage })

      return newLastMessage
    }

    async function deleteMessageHandler(messageId: string, conversationId: string) {
      const message = await Message.findOne({
        _id: messageId,
        conversationId,
        "sender._id": new Types.ObjectId(userId),
      })
        .select("attachments")
        .lean()

      if (!message) {
        socket.emit("error", "Message not found")
        return
      }

      await Message.findByIdAndDelete(messageId)

      for (const msg of message.attachments || []) {
        await deleteObject(msg)
      }

      // Update all messages that reply to this deleted message in one query
      await Message.updateMany(
        {
          "replyTo._id": new Types.ObjectId(messageId),
          conversationId,
        },
        {
          replyTo: null,
          replyToDeleted: true,
        }
      )

      const newLastMessage = await updateLastMessage(conversationId)

      // Emit the deleted message event to all users in the conversation
      io.to(conversationId).emit("messageDeleted", {
        messageId,
        newLastMessage,
      })
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

    socket.on("disconnect", () => {})

    socket.on(
      "newMessage",
      handleSocketEvent(
        "newMessage",
        async ({ conversationId, postId, content, attachments, replyTo }) => {
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

          const message = await Message.create({
            conversationId: new Types.ObjectId(conversationId),
            postId: postId ? new Types.ObjectId(postId) : undefined,
            sender: {
              _id: new Types.ObjectId(userId),
              username: user.username,
            },
            content,
            attachments: keys,
            replyTo: replyTo
              ? {
                  ...replyTo,
                  _id: new Types.ObjectId(replyTo._id),
                }
              : undefined,
          })

          if (!message) {
            socket.emit("error", "Message not found after creation")
            return
          }

          // populate sender picture
          message.sender.picture = user.picture
          await User.updateUserPicture([message.sender])

          io.to(conversationId).emit("message", message)

          const lastMessage: LastMessageType = {
            _id: message._id,
            sender: message.sender,
            postId: postId ? new Types.ObjectId(postId) : undefined,
            content: message.content,
            attachmentsCount: attachments?.length || 0,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
          }

          // Update lastMessage in Conversation
          await Conversation.findByIdAndUpdate(conversationId, { lastMessage })

          const isOtherMemberConnected = Array.from(io.sockets.values()).some(
            s => (s.user!.sub as string) === otherMemberId?.toString()
          )

          if (otherUserPushToken && !isOtherMemberConnected) {
            await sendPushNotification(
              otherUserPushToken,
              message.sender.username,
              content ? content : "Sent an attachment"
            )
          }
        }
      )
    )

    socket.on(
      "getConversations",
      handleSocketEvent("getConversations", async () => {
        const conversations = await Conversation.aggregate<AllConversationsType>([
          { $match: { members: new Types.ObjectId(userId) } },
          {
            $lookup: {
              from: "users",
              localField: "members",
              foreignField: "_id",
              as: "members",
            },
          },
          {
            $project: {
              _id: 1,
              members: {
                _id: 1,
                username: 1,
                picture: 1,
              },
              contactedPosts: 1,
              lastMessage: 1,
            },
          },
        ])

        await User.updateUserPicture(conversations.flatMap(conv => conv.members))

        socket.emit("conversations", conversations)
      })
    )

    socket.on(
      "newConversation",
      handleSocketEvent("newConversation", async (memberIds, post) => {
        const existingConversation = await Conversation.findOne({ members: { $all: memberIds } })
          .populate<AllConversationsType>({
            path: "members",
            select: "username picture",
          })
          .lean()

        if (existingConversation) {
          if (post) {
            // Check if the post is already in contactedPosts
            const postAlreadyContacted = existingConversation.contactedPosts.some(
              contactedPost => contactedPost.postId.toString() === post.postId.toString()
            )

            if (!postAlreadyContacted) {
              existingConversation.contactedPosts.push({ ...post, isDeleted: false })
              await Conversation.findByIdAndUpdate(existingConversation._id, {
                contactedPosts: existingConversation.contactedPosts,
              })
            }
          }

          await User.updateUserPicture(existingConversation.members)
          socket.emit("conversation", existingConversation)
          return
        }

        const conversation = await Conversation.create({
          members: memberIds,
          ...(post ? { contactedPosts: [post] } : {}),
          createdBy: userId,
        })

        const connectedSockets = Array.from(io.sockets.values()).filter(s =>
          memberIds.includes(s.user!.sub as unknown as Types.ObjectId)
        )

        connectedSockets.forEach(s => {
          s.join(conversation._id.toString())
        })

        const populatedConversation = await Conversation.findOne({
          members: { $all: memberIds },
          ...(post ? { "contactedPosts.postId": new Types.ObjectId(post.postId) } : {}),
        })
          .populate<AllConversationsType>({
            path: "members",
            select: "username picture",
          })
          .lean()

        if (!populatedConversation) {
          socket.emit("error", "Conversation not found after creation")
          return
        }

        await User.updateUserPicture(populatedConversation.members)

        io.to(conversation._id.toString()).emit("conversation", populatedConversation)
      })
    )

    socket.on(
      "getMessages",
      handleSocketEvent("getMessages", async ({ conversationId, postId, start, end }) => {
        const skip = Math.max(0, start)
        const limit = Math.max(0, end - start)

        if (limit === 0) {
          socket.emit("messages", [])
          return
        }

        const messages = await Message.aggregate<ConversationMessagesType>([
          {
            $match: {
              conversationId: new Types.ObjectId(conversationId),
              postId: postId ? new Types.ObjectId(postId) : undefined,
            },
          },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              conversationId: 1,
              content: 1,
              createdAt: 1,
              updatedAt: 1,
              attachments: 1,
              replyTo: 1,
              replyToDeleted: 1,
              isEdited: 1,
              sender: 1,
            },
          },
        ])

        for (const msg of messages) {
          if (msg.attachments) {
            const urls = []
            for (const key of msg.attachments) {
              const url = await getObject(key)
              url && urls.push(url)
            }
            msg.attachments = urls
          }
        }

        if (messages.length === 0) {
          socket.emit("messages", [])
          return
        }

        const conversation = await Conversation.findById(conversationId).select("members").lean()
        otherMemberId = conversation?.members.find(memberId => memberId.toString() !== userId)

        if (otherMemberId) {
          const otherUser = await User.findById(otherMemberId).select("expoPushToken").lean()
          otherUserPushToken = otherUser?.expoPushToken
        }

        socket.emit("messages", messages)
      })
    )

    socket.on(
      "editMessage",
      handleSocketEvent("editMessage", async ({ messageId, conversationId, newContent }) => {
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

        // update all replies to this message in one query
        await Message.updateMany(
          { "replyTo._id": new Types.ObjectId(messageId), conversationId },
          { "replyTo.content": newContent }
        )

        await updateLastMessage(conversationId)

        // Emit confirmation with the new content so replies can be updated
        io.to(conversationId).emit("messageEdited", {
          messageId: updatedMessage._id,
          conversationId: updatedMessage.conversationId,
          updatedAt: updatedMessage.updatedAt,
          content: updatedMessage.content,
        })
      })
    )

    socket.on(
      "deleteMessage",
      handleSocketEvent("deleteMessage", async ({ messageId, conversationId }) => {
        await deleteMessageHandler(messageId, conversationId)
      })
    )

    if (!connected) {
      socket.emit("connected", "You are connected to chat namespace")
      connected = true
    }
  })
}
