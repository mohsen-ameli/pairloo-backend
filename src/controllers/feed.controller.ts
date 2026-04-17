import { Request, Response } from "express"
import User from "../models/user.model"

export async function feedGet(req: Request, res: Response) {
  const userId = req.user!.sub
  const results = []

  const allUsers = await User.find(
    { _id: { $ne: userId }, "posts.0": { $exists: true } },
    {
      "posts._id": 1,
      "posts.username": 1,
      "posts.firstName": 1,
      "posts.lastName": 1,
      "posts.title": 1,
      username: 1,
      firstName: 1,
      lastName: 1,
      picture: 1,
    }
  )

  await User.updateUserPicture(allUsers)

  for (const user of allUsers) {
    for (const post of user.posts) {
      const data = {
        _id: post._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
        title: post.title,
      }
      results.push(data)
    }
  }

  res.status(200).json(results)
}
