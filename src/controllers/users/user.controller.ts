import { Request, Response } from "express"
import User from "../../models/user.model"
import mongoose from "mongoose"
import Post from "../../models/post.model"
import Interaction from "../../models/interaction.model"

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

type ReviewsType = {
  ratingCount: number
  ratingAvg: number
  reviews: {
    rating: number
    review: string
    createdAt: Date
    reviewer: {
      _id: string
      picture: string
      username: string
      firstName: string
      lastName: string
    }
  }[]
}

type MyUserType = {
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
  locationId: number // reference to Location _id
  email: string
  expoPushToken?: string
  savedPosts?: string[]
  createdAt: Date
  updatedAt: Date
  followersCount: number
  followingCount: number
}

// user's social information (followers, following, and their corresponding counts)
export async function socialGet(req: Request, res: Response) {
  const userId = req.params.id as string

  try {
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
      return res.status(404).json({ error: "User not found" })
    }

    await User.updateUserPicture([...user.followers, ...user.following])

    return res.json(user)
  } catch (error) {
    console.error("Error fetching user social information:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

// user's reviews and ratings
export async function reviewsGet(req: Request, res: Response) {
  const userId = req.params.id as string

  try {
    const userAggregate = await User.aggregate<ReviewsType>([
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

    for (const review of user.reviews) {
      await User.updateUserPicture(review.reviewer)
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
    const userAggregate = await User.aggregate<MyUserType>([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      {
        $project: {
          username: 1,
          firstName: 1,
          lastName: 1,
          picture: 1,
          phoneNumber: 1,
          country: 1,
          city: 1,
          state: 1,
          latitude: 1,
          longitude: 1,
          timezone: 1,
          locationId: 1,
          email: 1,
          expoPushToken: 1,
          savedPosts: 1,
          followersCount: { $size: { $ifNull: ["$followers", []] } },
          followingCount: { $size: { $ifNull: ["$following", []] } },
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ])

    const user = userAggregate[0]

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

export async function savePost(req: Request, res: Response) {
  const userId = req.user!.sub
  const postId = req.params.postId as string

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $push: { savedPosts: { $each: [postId], $position: 0 } } },
      { new: true, select: "savedPosts" }
    )

    await Interaction.create({ userId, postId, type: "save", createdAt: new Date() })

    return res
      .status(200)
      .json({ message: "Post saved successfully", savedPosts: updatedUser?.savedPosts })
  } catch (error) {
    console.error("Error saving post:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

export async function unsavePost(req: Request, res: Response) {
  const userId = req.user!.sub
  const postId = req.params.postId as string

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { savedPosts: postId } },
      { new: true, select: "savedPosts" }
    )

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" })
    }

    await Interaction.deleteOne({ userId, postId, type: "save" })

    return res
      .status(200)
      .json({ message: "Post unsaved successfully", savedPosts: updatedUser.savedPosts })
  } catch (error) {
    console.error("Error unsaving post:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

export async function getSavedPosts(req: Request, res: Response) {
  const userId = req.user!.sub

  try {
    const savedIdsDoc = await User.findById(userId).select("savedPosts").lean()

    if (!savedIdsDoc) {
      return res.status(404).json({ message: "User not found" })
    }
    const savedPostIds = savedIdsDoc.savedPosts

    const savedPosts = await Post.find(
      { _id: { $in: savedPostIds } },
      {
        _id: 1,
        title: 1,
        images: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: -1 })
      .lean()

    for (const post of savedPosts) {
      await Post.updatePostImages(post)
    }

    return res.status(200).json(savedPosts)
  } catch (error) {
    console.error("Error fetching saved posts:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
