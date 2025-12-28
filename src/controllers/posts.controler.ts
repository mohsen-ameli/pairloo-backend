import { Request, Response } from "express";
import Product from "../models/product.model";

export async function allPostsGet(req: Request, res: Response) {
  const userId = req.user!.sub;

  const products = await Product.find({ userId });
  products.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.status(200).json(products);
}

export async function specificPostGet(req: Request, res: Response) {
  const postId = req.params.id;

  const product = await Product.findById(postId);
  if (!product) {
    return res.status(404).json({ message: "Post not found" });
  }

  res.status(200).json(product);
}

export async function specificPostDelete(req: Request, res: Response) {
  const postId = req.params.id;
  const userId = req.user!.sub;

  const product = await Product.findById(postId);
  if (!product) {
    return res.status(404).json({ message: "Post not found" });
  }

  if (product.userId.toString() !== userId) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  await product.deleteOne();
  res.status(200).json({ message: "Post deleted successfully" });
}
