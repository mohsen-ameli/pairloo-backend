import mongoose from "mongoose";
import { isEmail } from "validator";

export interface VerificationType extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  email?: string;
  phoneNumber?: string;
  code: number;
  createdAt: Date;
}

const verificationSchema = new mongoose.Schema<VerificationType>({
  email: {
    type: String,
    required: [false, "Please enter your email"],
    unique: true,
    trim: true,
    lowercase: true,
    validate: [isEmail, "Please enter a valid email"],
  },
  phoneNumber: {
    type: String,
    required: [false, "Please enter your phone number"],
    unique: true,
    trim: true,
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
});

const Verification = mongoose.model<VerificationType>(
  "verification",
  verificationSchema,
);
export default Verification;
