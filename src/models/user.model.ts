import mongoose from "mongoose";
import { isEmail } from "validator";
import postSchema, { PostType } from "./post.model";

export interface UserType extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  country: string;
  city: string;
  state: string;
  coordinates: [number, number]; // [longitude, latitude]
  timezone: string;
  locationId: number;
  email: string;
  picture?: string | undefined;
  posts: mongoose.Types.DocumentArray<PostType>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<UserType>(
  {
    username: {
      type: String,
      required: [true, "Please enter a username"],
      unique: [true, "Username already exists"],
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, "Please enter your first name"],
      unique: false,
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Please enter your last name"],
      unique: false,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Please enter your phone number"],
      unique: [true, "Phone number already exists"],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Please enter your country"],
      unique: false,
      trim: true,
    },
    city: {
      type: String,
      required: [true, "Please enter your city"],
      unique: false,
      trim: true,
    },
    state: {
      type: String,
      required: false,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
    timezone: {
      type: String,
      required: [true, "Please enter your timezone"],
      trim: true,
    },
    locationId: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      unique: [true, "Email already exists"],
      trim: true,
      lowercase: true,
      validate: [isEmail, "Please enter a valid email"],
    },
    picture: {
      type: String,
      required: false,
      unique: false,
    },
    posts: [postSchema],
  },
  { timestamps: true }
);

const User = mongoose.model<UserType>("user", userSchema);
export default User;
