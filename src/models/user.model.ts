import mongoose from "mongoose"
import { isEmail } from "validator"
import { getObject } from "../utils/s3"

export interface UserType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  username: string
  firstName: string
  lastName: string
  phoneNumber?: string | null
  birthdate: Date
  country: string
  city: string
  state: string
  latitude: number
  longitude: number
  timezone: string
  locationId: number
  email: string
  expoPushToken?: string
  picture?: string | null
  savedPosts: mongoose.Types.ObjectId[]
  followers: mongoose.Types.ObjectId[]
  following: mongoose.Types.ObjectId[]
  reviews: {
    userId: mongoose.Types.ObjectId
    rating: number
    review: string
    createdAt: Date
  }[]
  createdAt: Date
  updatedAt: Date
}

type UserPictureTarget = Pick<UserType, "picture">

interface UserModel extends mongoose.Model<UserType> {
  updateUserPicture(users: UserPictureTarget[] | UserPictureTarget): Promise<void>
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
      trim: true,
    },
    birthdate: {
      type: Date,
      required: [true, "Please enter your birthdate"],
      unique: false,
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
    expoPushToken: {
      type: String,
      required: false,
      unique: false,
    },
    picture: {
      type: String,
      required: false,
      unique: false,
    },
    savedPosts: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "post",
        },
      ],
      default: [],
    },
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
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
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
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
)

// Update user's profile picture with new signed URL if expired
userSchema.statics.updateUserPicture = async function (
  users: UserPictureTarget[] | UserPictureTarget
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
