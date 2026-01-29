import mongoose from "mongoose"
import { isEmail } from "validator"
import postSchema, { PostType } from "./post.model"
import { getObject } from "../utils/s3"
import { S3Object, s3ObjectSchema } from "./s3Object.model"
import { isSignedUrlExpired } from "../utils/is-signed-url-expired"

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

interface UserModel extends mongoose.Model<UserType> {
  updateUserPostImages(post: PostType): Promise<void>
  updateUserPicture(docs: UserType[] | UserType): Promise<void>
}

const userSchema = new mongoose.Schema<UserType, UserModel>(
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

// Update the user's post images with new signed URLs if expired
userSchema.statics.updateUserPostImages = async function updateUserPostImages(post: PostType) {
  if (!post || !post.images || post.images.length === 0) return post

  for (const image of post.images) {
    if (!image || !image.key || !isSignedUrlExpired(image.url)) continue

    const url = await getObject(image.key)
    if (!url) continue
    await User.updateOne(
      { _id: post._id, "posts._id": post.postId },
      {
        $set: {
          "posts.$.images.$[img].url": url,
        },
      },
      {
        arrayFilters: [{ "img.key": image.key }],
      }
    )

    image.url = url
  }
}

// Update user's profile picture with new signed URL if expired
userSchema.statics.updateUserPicture = async function updateUserPicture(
  users: UserType[] | UserType
) {
  if (!Array.isArray(users)) {
    users = [users]
  }
  if (!users || users.length === 0) return

  for (const user of users) {
    if (!user.picture || !user.picture.key || !isSignedUrlExpired(user.picture.url)) continue

    const url = await getObject(user.picture.key)
    if (!url) continue
    await User.findByIdAndUpdate(user._id, { picture: { url } })
    user.picture.url = url
  }
}

const User = mongoose.model<UserType, UserModel>("user", userSchema)
export default User
