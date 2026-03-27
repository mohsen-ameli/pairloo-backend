import { Request, Response } from "express"
import User, { UserType } from "../../models/user.model"
import mongoose from "mongoose"

// My user's social information (followers, following, and their corresponding counts)
export async function mySocialGet(req: Request, res: Response) {
  const userId = req.user!.sub

  const userAggregate = await User.aggregate<UserType>([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    {
      $project: {
        followersCount: { $size: { $ifNull: ["$followers", []] } },
        followingCount: { $size: { $ifNull: ["$following", []] } },
      },
    },
  ])

  const user = userAggregate[0]

  if (!user) {
    return res.status(404).json({ error: "User not found" })
  }

  return res.json(user)
}

// My user's reviews and ratings
export async function myReviewsGet(req: Request, res: Response) {
  const userId = req.user!.sub

  const userAggregate = await User.aggregate<UserType>([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: "users",
        localField: "reviews.userId",
        foreignField: "_id",
        as: "reviewerDetails",
      },
    },
    {
      $project: {
        ratingCount: { $size: { $ifNull: ["$ratings", []] } },
        ratingAvg: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$ratings", []] } }, 0] },
            { $avg: "$ratings.rating" },
            0,
          ],
        },
        reviews: {
          $map: {
            input: "$reviews",
            as: "review",
            in: {
              rating: "$$review.rating",
              review: "$$review.review",
              createdAt: "$$review.createdAt",
              reviewer: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$reviewerDetails",
                      as: "reviewer",
                      cond: { $eq: ["$$reviewer._id", "$$review.userId"] },
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
      },
    },
    {
      $project: {
        ratingCount: 1,
        ratingAvg: 1,
        reviews: {
          $map: {
            input: "$reviews",
            as: "review",
            in: {
              rating: "$$review.rating",
              review: "$$review.review",
              createdAt: "$$review.createdAt",
              reviewer: {
                _id: "$$review.reviewer._id",
                picture: "$$review.reviewer.picture",
                username: "$$review.reviewer.username",
                firstName: "$$review.reviewer.firstName",
                lastName: "$$review.reviewer.lastName",
              },
            },
          },
        },
      },
    },
  ])

  const user = userAggregate[0]

  if (!user) {
    return res.status(404).json({ error: "User not found" })
  }

  return res.json(user)
}

// My user's posts
export async function myPostsGet(req: Request, res: Response) {
  const userId = req.user!.sub

  interface ProjectedDocument {
    posts: Array<{
      _id: string
      title: string
      initialPostText: string
      createdAt: Date
      images: string[]
      isDraft: boolean
      publicPost: boolean
      closestPosts?: Array<{ score: number; item: string }>
    }>
  }

  const posts = await User.findOne<ProjectedDocument>({ _id: userId }).select(
    "posts._id posts.title posts.initialPostText posts.createdAt posts.images posts.isDraft posts.publicPost posts.closestPosts"
  )

  for (const post of posts?.posts || []) {
    await User.updateUserPostImages(post as any)
  }

  if (!posts) {
    return res.status(404).json({ message: "User not found" })
  }

  posts.posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  res.status(200).json(posts.posts)
}

// My user's general information
export async function myUserGet(req: Request, res: Response) {
  const userId = req.user!.sub

  const user = await User.findById(userId).select(
    "username firstName lastName picture phoneNumber country city state latitude longitude timezone locationId email createdAt updatedAt"
  )

  if (!user) {
    return res.status(404).json({ error: "User not found" })
  }

  await User.updateUserPicture(user)

  return res.json(user)
}
