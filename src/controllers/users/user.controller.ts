import { Request, Response } from "express"
import User, { UserType } from "../../models/user.model"
import mongoose from "mongoose"
import Post from "../../models/post.model"

type SocialUserType = {
  _id: string
  username: string
  firstName: string
  lastName: string
  picture?: string | null
}

type SocialUsersType = {
  followersCount: number
  followingCount: number
  followers: SocialUserType[]
  following: SocialUserType[]
}

async function getSocialUsers(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null
  }

  const userAggregate = await User.aggregate<SocialUsersType>([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: "users",
        localField: "followers",
        foreignField: "_id",
        as: "followerUsers",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "following",
        foreignField: "_id",
        as: "followingUsers",
      },
    },
    {
      $project: {
        followersCount: { $size: { $ifNull: ["$followerUsers", []] } },
        followingCount: { $size: { $ifNull: ["$followingUsers", []] } },
        followers: {
          $map: {
            input: { $ifNull: ["$followerUsers", []] },
            as: "user",
            in: {
              _id: "$$user._id",
              username: "$$user.username",
              firstName: "$$user.firstName",
              lastName: "$$user.lastName",
              picture: "$$user.picture",
            },
          },
        },
        following: {
          $map: {
            input: { $ifNull: ["$followingUsers", []] },
            as: "user",
            in: {
              _id: "$$user._id",
              username: "$$user.username",
              firstName: "$$user.firstName",
              lastName: "$$user.lastName",
              picture: "$$user.picture",
            },
          },
        },
      },
    },
  ])

  const user = userAggregate[0]

  if (!user) {
    return null
  }

  await User.updateUserPicture([...user.followers, ...user.following])

  return user
}

// My user's social information (followers, following, and their corresponding counts)
export async function mySocialGet(req: Request, res: Response) {
  const userId = req.user!.sub

  try {
    const user = await getSocialUsers(userId)

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    return res.json(user)
  } catch (error) {
    console.error("Error fetching user social information:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

// My user's reviews and ratings
export async function myReviewsGet(req: Request, res: Response) {
  const userId = req.user!.sub

  try {
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
  } catch (error) {
    console.error("Error fetching user reviews:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

// My user's posts
export async function myPostsGet(req: Request, res: Response) {
  const userId = req.user!.sub

  try {
    const posts = await Post.find({ userId }).sort({ createdAt: -1 })
    if (!posts) {
      return res.status(404).json({ message: "Posts not found" })
    }

    for (const post of posts) {
      await Post.updatePostImages(post)
    }

    return res.status(200).json(posts)
  } catch (error) {
    console.error("Error fetching user posts:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

// My user's general information
export async function myUserGet(req: Request, res: Response) {
  const userId = req.user!.sub

  try {
    const user = await User.findById(userId).select(
      "username firstName lastName picture phoneNumber country city state latitude longitude timezone locationId email expoPushToken createdAt updatedAt"
    )

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    await User.updateUserPicture(user)

    return res.json(user)
  } catch (error) {
    console.error("Error fetching user information:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
