import { Request, Response } from "express"
import User from "../../models/user.model"
import createJWT from "../../utils/create-jwt"
import { sendObject } from "../../utils/s3"

export async function signupPost(req: Request, res: Response) {
  const userData = {
    username: req.body.username.toLowerCase(),
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phoneNumber: req.body.phoneNumber,
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

    await newUser.save()

    const { accessToken, refreshToken } = await createJWT(userId)

    return res.status(201).json({
      _id: newUser._id,
      accessToken,
      refreshToken,
    })
  } catch (err: any) {
    return res.status(500).json({ errors: { general: err.message } })
  }
}

async function handleSignupErrors(err: any, user: typeof User.prototype) {
  const errors = {
    username: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
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
          { phoneNumber: user.phoneNumber },
        ],
      },
      { username: 1, email: 1, phoneNumber: 1 }
    )

    if (existingUser) {
      if (existingUser.username === user.username) {
        errors.username = "Username already exists"
      }
      if (existingUser.email === user.email) {
        errors.email = "Email already exists"
      }
      if (existingUser.phoneNumber === user.phoneNumber) {
        errors.phoneNumber = "Phone number already exists"
      }
      return errors
    }
  }
  return null
}
