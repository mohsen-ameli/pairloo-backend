import { Request, Response } from "express"
import User from "../models/user.model"

export async function feedGet(req: Request, res: Response) {
  const userId = req.user!.sub
  const results = []

  const allUsers = await User.find({ _id: { $ne: userId } })
  for (const user of allUsers) {
    for (const post of user.posts) {
      const data = {
        _id: post._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
        state: user.state,
        latitude: user.latitude,
        longitude: user.longitude,
        timezone: user.timezone,
        locationId: user.locationId,
        content: post.content,
      }
      results.push(data)
    }
  }

  res.status(200).json(results)
}
