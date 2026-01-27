import mongoose from "mongoose"
import { isEmail } from "validator"
import postSchema, { PostType } from "./post.model"
import { getObject } from "../utils/s3"
import { S3Object, s3ObjectSchema } from "./s3Object.model"
import { S3_EXPIRES_IN_SECONDS } from "../utils/constants"

export interface UserType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  username: string
  firstName: string
  lastName: string
  phoneNumber: string
  country: string
  city: string
  state: string
  latitude: number
  longitude: number
  timezone: string
  locationId: number
  email: string
  picture?: S3Object
  posts: mongoose.Types.DocumentArray<PostType>
  createdAt: Date
  updatedAt: Date
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
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
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
      type: s3ObjectSchema,
      required: false,
      unique: false,
    },
    posts: [postSchema],
  },
  { timestamps: true }
)

async function updateUserPicture(docs: UserType[] | UserType) {
  if (!docs || (docs instanceof Array && docs.length === 0)) return

  if (!(docs instanceof Array)) {
    docs = [docs]
  }

  for (const doc of docs) {
    if (
      !doc.picture ||
      !doc.picture.key ||
      (doc.picture.url &&
        Date.now() - new Date(doc.picture.createdAt).getTime() < 1000 * S3_EXPIRES_IN_SECONDS)
    )
      continue

    const url = await getObject(doc.picture.key)
    if (!url) continue
    doc.picture.url = url
    doc.picture.createdAt = new Date()
    await User.findByIdAndUpdate(doc._id, { picture: doc.picture })
  }
}

userSchema.post("find", updateUserPicture)
userSchema.post("findOne", updateUserPicture)

const User = mongoose.model<UserType>("user", userSchema)
export default User
