import { Request, Response } from "express"
import User from "../../models/user.model"
import mongoose from "mongoose"
import { PostType } from "../../models/post.model"

type UserProfileType = {
  username: string
  firstName: string
  lastName: string
  picture: string
  phoneNumber: string
  country: string
  city: string
  state: string
  latitude: number
  longitude: number
  timezone: string
  email: string
  posts: PostType[]
  followersCount: number
  followingCount: number
  ratingCount: number
  ratingAvg: number
  reviews: {
    rating: number
    review: string
    reviewer: {
      _id: string
      picture: string
      username: string
      firstName: string
      lastName: string
    }
  }[]
  createdAt: Date
  updatedAt: Date
}

export async function userProfileGet(req: Request, res: Response) {
  const myId = req.user!.sub
  const userId = req.params.id as string

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" })
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid user ID" })
  }

  try {
    const userAggregate = await User.aggregate([
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
          posts: {
            $map: {
              input: {
                $filter: {
                  input: "$posts",
                  as: "post",
                  cond: { $eq: ["$$post.publicPost", true] },
                },
              },
              as: "post",
              in: {
                _id: "$$post._id",
                title: "$$post.title",
                images: "$$post.images",
                createdAt: "$$post.createdAt",
              },
            },
          },
          username: 1,
          firstName: 1,
          lastName: 1,
          picture: 1,
          createdAt: 1,
          followersCount: { $size: { $ifNull: ["$followers", []] } },
          followingCount: { $size: { $ifNull: ["$following", []] } },
          ratingCount: { $size: { $ifNull: ["$reviews", []] } },
          ratingAvg: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ["$reviews", []] } }, 0] },
              { $avg: "$reviews.rating" },
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
          isFollowing: {
            $in: [new mongoose.Types.ObjectId(myId), "$followers"],
          },
        },
      },
      {
        $project: {
          posts: 1,
          username: 1,
          firstName: 1,
          lastName: 1,
          picture: 1,
          createdAt: 1,
          followersCount: 1,
          followingCount: 1,
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
          isFollowing: 1,
        },
      },
    ])

    const user = userAggregate[0] as UserProfileType

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    await User.updateUserPicture(user)

    for (const review of user.reviews) {
      await User.updateUserPicture(review.reviewer)
    }

    for (const post of user.posts) {
      await User.updateUserPostImages(post)
    }

    return res.json(user)
  } catch (error) {
    console.error("Error in user profile:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
