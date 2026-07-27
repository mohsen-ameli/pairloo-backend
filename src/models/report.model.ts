import mongoose from "mongoose"

export interface ReportType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  reporter: mongoose.Types.ObjectId
  user?: mongoose.Types.ObjectId
  post?: mongoose.Types.ObjectId
  report: string
  reportedAt: Date
}

const reportSchema = new mongoose.Schema<ReportType>({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "post",
  },
  report: {
    type: String,
    required: true,
  },
  reportedAt: {
    type: Date,
    default: Date.now,
  },
})

const Report = mongoose.model<ReportType>("report", reportSchema)
export default Report
