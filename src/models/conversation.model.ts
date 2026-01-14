import mongoose from "mongoose";
import { messageSchema, MessageType } from "./message.model";

export interface ConversationType extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  lastMessage?: MessageType;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new mongoose.Schema<ConversationType>({
  members: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "user",
    required: true,
  },
  lastMessage: {
    type: messageSchema,
    required: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

conversationSchema.pre("save", function () {
  this.updatedAt = new Date();
});

const Conversation = mongoose.model<ConversationType>(
  "conversation",
  conversationSchema
);
export default Conversation;
