import mongoose from "mongoose"

export interface VerificationType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  email?: string
  phoneNumber?: string
  code: number
  createdAt: Date
}

const verificationSchema = new mongoose.Schema<VerificationType>({
  email: {
    type: String,
    required: [false, "Please enter your email"],
  },
  phoneNumber: {
    type: String,
    required: [false, "Please enter your phone number"],
  },
  code: {
    type: Number,
    required: [true, "Verification code is required"],
    unique: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // Code expires in 5 minutes
  },
})

const Verification = mongoose.model<VerificationType>("verification", verificationSchema)
export default Verification
