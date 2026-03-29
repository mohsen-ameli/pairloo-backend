import mongoose from "mongoose"

export interface EmailVerificationType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  email: string
  code: number
  createdAt: Date
}

const emailVerificationSchema = new mongoose.Schema<EmailVerificationType>({
  email: {
    type: String,
    required: [true, "Please enter your email"],
    unique: true,
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

const EmailVerification = mongoose.model<EmailVerificationType>(
  "email-verification",
  emailVerificationSchema
)
export default EmailVerification
