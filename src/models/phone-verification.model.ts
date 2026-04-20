import mongoose from "mongoose"

export interface PhoneVerificationType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  phoneNumber: string
  code: number
  createdAt: Date
}

const phoneVerificationSchema = new mongoose.Schema<PhoneVerificationType>({
  phoneNumber: {
    type: String,
    required: [true, "Please enter your phone number"],
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

const PhoneVerification = mongoose.model<PhoneVerificationType>(
  "phone-verification",
  phoneVerificationSchema
)
export default PhoneVerification
