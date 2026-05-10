import { Request, Response } from "express"
import mongoose from "mongoose"
import User from "../models/user.model"

type UserSearchType = mongoose.Document & {
  firstName: string
  lastName: string
  username: string
  picture: string
}

export async function searchUsers(req: Request, res: Response) {
  try {
    const query = req.query.q?.toString().trim()
    if (!query) {
      return res.json([])
    }

    const results: UserSearchType[] = await User.aggregate([
      {
        $search: {
          index: "user_search",
          compound: {
            should: [
              {
                autocomplete: {
                  query,
                  path: "firstName",
                },
              },
              {
                autocomplete: {
                  query,
                  path: "lastName",
                },
              },
              {
                autocomplete: {
                  query,
                  path: "username",
                },
              },
            ],
            minimumShouldMatch: 1,
          },
        },
      },
      {
        $sort: { searchScore: -1 },
      },
      { $limit: 10 },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          username: 1,
          picture: 1,
          score: {
            $meta: "searchScore",
          },
        },
      },
    ])

    await User.updateUserPicture(results)

    res.json(results)
  } catch (error) {
    console.error("Error searching users:", error)
    res.status(500).json({ error: "Failed to search users" })
  }
}
