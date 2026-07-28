import { Request, Response } from "express"
import User from "../../models/user.model"
import createJWT from "../../utils/create-jwt"
import { sendObject } from "../../utils/s3"
import {
  ACCESS_COOKIE_NAME,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
} from "../../utils/constants"

export async function signupPost(req: Request, res: Response) {
  const userData = {
    username: req.body.username.toLowerCase(),
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    picture: req.body.picture,
    // phoneNumber: req.body.phoneNumber,
    birthdate: req.body.birthdate,
    country: req.body.country,
    city: req.body.city,
    state: req.body.state,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    timezone: req.body.timezone,
    locationId: req.body.locationId,
    email: req.body.email.toLowerCase(),
  }

  try {
    const newUser = new User(userData)
    const err = newUser.validateSync()
    const errors = await handleSignupErrors(err, userData)
    if (errors) return res.status(400).json({ errors })
    const userId = newUser._id.toString()

    if (req.file) {
      try {
        const key = await sendObject("user-pictures", req.file.buffer, req.file.mimetype, userId)
        newUser.picture = key
      } catch (err) {
        console.error("Error uploading profile picture:", err)
        return res.status(500).json({ error: "Failed to upload profile picture." })
      }
    }

    const user = await newUser.save()

    const { accessToken, refreshToken } = await createJWT(user._id.toString())

    // Handle web platform with cookies
    if (req.body.platform === "web") {
      // Set the access token in an HTTP-only cookie
      res.cookie(ACCESS_COOKIE_NAME, accessToken, ACCESS_COOKIE_OPTIONS)

      // Set the refresh token in a separate HTTP-only cookie
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS)

      return res.status(200).json({ _id: user._id })
    }

    return res.status(200).json({ _id: user._id, accessToken, refreshToken })
  } catch (err: any) {
    console.error("Error during signup:", err)
    return res.status(500).json({ errors: { general: err.message } })
  }
}

async function handleSignupErrors(err: any, user: typeof User.prototype) {
  const errors = {
    username: "",
    firstName: "",
    lastName: "",
    // phoneNumber: "",
    birthdate: "",
    country: "",
    city: "",
    email: "",
  }
  if (err) {
    Object.values(err.errors).forEach(({ properties }: any) => {
      errors[properties.path as keyof typeof errors] = properties.message
    })
    return errors
  } else {
    // query for existing username, email, phoneNumber
    const existingUser = await User.findOne(
      {
        $or: [
          { username: user.username },
          { email: user.email },
          // { phoneNumber: user.phoneNumber },
        ],
      },
      {
        username: 1,
        email: 1,
        // phoneNumber: 1
      }
    )

    if (existingUser) {
      if (existingUser.username === user.username) {
        errors.username = "Username already exists"
      }
      if (existingUser.email === user.email) {
        errors.email = "Email already exists"
      }
      // if (existingUser.phoneNumber === user.phoneNumber) {
      //   errors.phoneNumber = "Phone number already exists"
      // }
      return errors
    }

    // User has to be at least 13 years old
    const today = new Date()
    const birthdate = new Date(user.birthdate)
    let age = today.getFullYear() - birthdate.getFullYear()
    const monthDiff = today.getMonth() - birthdate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
      age--
    }
    if (age < 13) {
      errors.birthdate = "You must be at least 13 years old to sign up"
      return errors
    }
  }
  return null
}
