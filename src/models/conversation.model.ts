import mongoose from "mongoose";

export interface ConversationType extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
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
    type: mongoose.Schema.Types.ObjectId,
    ref: "message",
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
