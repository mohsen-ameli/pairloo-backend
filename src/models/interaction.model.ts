import mongoose from "mongoose"

export type InteractionTypeEnum = "post_view" | "profile_view" | "contact" | "save"

export interface InteractionType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  postId: mongoose.Types.ObjectId
  type: InteractionTypeEnum
  count: number
  createdAt: Date
  updatedAt: Date
}

const interactionSchema = new mongoose.Schema<InteractionType>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "post",
    required: true,
  },
  type: {
    type: String,
    enum: ["post_view", "profile_view", "contact", "save"],
    required: true,
  },
  count: {
    type: Number,
    default: 1,
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

interactionSchema.pre("save", function () {
  this.updatedAt = new Date()
})

const Interaction = mongoose.model<InteractionType>("interaction", interactionSchema)
export default Interaction
