import { Request, Response } from "express";
import Post from "../models/post.model";
import mongoose from "mongoose";

export async function feedGet(req: Request, res: Response) {
  const userId = new mongoose.Types.ObjectId(req.user!.sub);

  const posts = await Post.aggregate([
    {
      $match: {
        userId: { $ne: userId },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "posts_docs",
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [{ $arrayElemAt: ["$posts_docs", 0] }, "$$ROOT"],
        },
      },
    },
    {
      $project: {
        userId: 1,
        username: 1,
        content: 1,
        summary: 1,
        image: 1,
        picture: 1,
      },
    },
  ]);

  res.status(200).json(posts);
}
