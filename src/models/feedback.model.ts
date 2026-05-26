import mongoose from "mongoose"

export interface FeedbackType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  userId: string
  title: string
  description: string
  createdAt: Date
}

const feedbackSchema = new mongoose.Schema<FeedbackType>({
  userId: {
    type: String,
    ref: "user",
    required: true,
  },
  title: {
    type: String,
    required: [true, "Feedback title is required"],
  },
  description: {
    type: String,
    required: [true, "Feedback description is required"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const Feedback = mongoose.model<FeedbackType>("feedback", feedbackSchema)
export default Feedback
