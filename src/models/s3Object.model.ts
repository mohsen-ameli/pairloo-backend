import mongoose from "mongoose"

export interface S3Object extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  key: string
  url: string
  createdAt: Date
}

export const s3ObjectSchema = new mongoose.Schema<S3Object>({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  url: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})
