import { DefaultEventsMap, Namespace, Server, Socket } from "socket.io";
import User from "../models/user.model";
import Conversation from "../models/conversation.model";
import { Types } from "mongoose";
import Message from "../models/message.model";

export function chatSocket(
  io: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) {
  io.on("connection", async (socket: Socket) => {
    const userId = socket.user!.sub;
    const user = await User.findById(userId);

    if (!user) {
      socket.emit("error", "User not found");
      socket.disconnect(true);
      return;
    }

    socket.emit("connected", "You are connected to chat namespace");

    console.log("user connected: ", userId);

    try {
      const conversations = await Conversation.find({
        members: userId,
      }).select("_id");

      conversations.forEach((conversation) => {
        socket.join(conversation._id.toString());
      });
    } catch (err: any) {
      console.log(err);
    }

    socket.on("disconnect", () => {
      console.log("user disconnected: ", userId);
    });

    socket.on("getConversations", async () => {
      console.log("getting conversations for:", userId);
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
            _id: Types.ObjectId;
            conversationId: Types.ObjectId;
            senderId: Types.ObjectId;
            content: string;
            createdAt: Date;
          };
        }>({
          path: "lastMessage",
          select: "_id conversationId senderId content createdAt",
        });
      socket.emit("conversations", conversations);
    });

    socket.on("newConversation", async (memberIds: Types.ObjectId[]) => {
      console.log("creating new conversation with members:", memberIds);
      const existingConversation = await Conversation.findOne({
        members: { $all: memberIds },
      })
        .populate({
          path: "members",
          select: "username picture email",
        })
        .lean();
      if (existingConversation) {
        socket.emit("conversation", {
          success: true,
          conversation: existingConversation,
        });
        return;
      }

      const conversation = await Conversation.create({
        members: memberIds,
        createdBy: userId,
      });

      const connectedSockets = Array.from(io.sockets.values()).filter((s) =>
        memberIds.includes(s.user!.sub as unknown as Types.ObjectId)
      );

      connectedSockets.forEach((s) => {
        s.join(conversation._id.toString());
      });

      const populatedConversation = await Conversation.findById(
        conversation._id
      )
        .populate({
          path: "members",
          select: "username picture email",
        })
        .lean();

      if (!populatedConversation) {
        socket.emit("conversation", {
          success: false,
          message: "Conversation not found after creation",
        });
        return;
      }

      io.to(conversation._id.toString()).emit("conversation", {
        success: true,
        conversation: populatedConversation,
      });
    });

    socket.on(
      "newMessage",
      async ({
        conversationId,
        content,
      }: {
        conversationId: string;
        content: string;
      }) => {
        console.log("new message:", content);
        const message = await Message.create({
          conversationId: new Types.ObjectId(conversationId),
          senderId: userId,
          content,
        });

        const populatedMessage = await Message.findById(message._id).populate<{
          senderId: {
            _id: Types.ObjectId;
            username: string;
            picture: string;
          };
        }>({
          path: "senderId",
          select: "username picture",
        });

        if (!populatedMessage) {
          socket.emit("error", "Message not found after creation");
          return;
        }

        const formattedMessage = {
          ...populatedMessage.toObject(),
          id: populatedMessage._id.toString(),
          sender: {
            id: populatedMessage.senderId._id.toString(),
            username: populatedMessage.senderId.username,
            picture: populatedMessage.senderId.picture,
          },
        };

        await new Promise((resolve) => setTimeout(resolve, 3000));
        io.to(conversationId).emit("message", formattedMessage);

        // Update lastMessage in Conversation
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
        });
      }
    );

    socket.on(
      "getMessages",
      async ({ conversationId }: { conversationId: string }) => {
        const messages = await Message.find({ conversationId })
          .sort({
            createdAt: 1,
          })
          .populate<{
            senderId: {
              _id: Types.ObjectId;
              username: string;
              picture: string;
            };
          }>({
            path: "senderId",
            select: "username picture",
          })
          .lean();

        const formattedMessages = messages.map((msg) => ({
          ...msg,
          id: msg._id.toString(),
          sender: {
            id: msg.senderId._id.toString(),
            username: msg.senderId.username.toString(),
            picture: msg.senderId.picture.toString(),
          },
        }));

        socket.emit("messages", formattedMessages);
      }
    );
  });
}
