import mongoose from "mongoose"
import { isEmail } from "validator"
import postSchema, { PostType } from "./post.model"
import { getObject } from "../utils/s3"

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
  picture?: string | null
  posts: mongoose.Types.DocumentArray<PostType>
  followers: mongoose.Types.ObjectId[]
  following: mongoose.Types.ObjectId[]
  reviews: {
    postId: mongoose.Types.ObjectId
    rating: number
    review: string
  }[]
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
      type: String,
      required: false,
      unique: false,
    },
    posts: [postSchema],
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    reviews: [
      {
        postId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "post",
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        review: {
          type: String,
          required: false,
        },
      },
    ],
  },
  { timestamps: true }
)

// Update the user's post images with new signed URLs if expired
userSchema.statics.updateUserPostImages = async function updateUserPostImages(post: PostType) {
  if (!post || !post.images || post.images.length === 0) return post

  const newImages = []

  for (let image of post.images) {
    if (!image) continue

    const url = await getObject(image)
    if (!url) continue
    newImages.push(url)
  }

  post.images = newImages
}

// Update user's profile picture with new signed URL if expired
userSchema.statics.updateUserPicture = async function updateUserPicture(
  users: UserType[] | UserType
) {
  if (!users || (users instanceof Array && users.length === 0)) return
  if (!Array.isArray(users)) {
    users = [users]
  }

  for (const user of users) {
    if (!user.picture) continue

    const url = await getObject(user.picture)
    if (!url) continue
    user.picture = url
  }
}

const User = mongoose.model<UserType, UserModel>("user", userSchema)
export default User
