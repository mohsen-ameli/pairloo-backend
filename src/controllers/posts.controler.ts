import { Request, Response } from "express";
import Post from "../models/post.model";

export async function postListGet(req: Request, res: Response) {
  const userId = req.user!.sub;

  const posts = await Post.find({ userId });
  posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.status(200).json(posts);
}

export async function postGet(req: Request, res: Response) {
  const postId = req.params.id;

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  res.status(200).json({
    _id: post._id,
    userId: post.userId,
    content: post.content,
    summary: post.summary,
    images: post.images,
    closePost: post.closestPosts,
    createdAt: post.createdAt,
  });
}

export async function postDelete(req: Request, res: Response) {
  const postId = req.params.id;
  const userId = req.user!.sub;

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  if (post.userId.toString() !== userId) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  await post.deleteOne();
  res.status(200).json({ message: "Post deleted successfully" });
}
