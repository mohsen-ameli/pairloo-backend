import { Request, Response } from "express";
import Product from "../models/product.model";
import { getClosestProduct } from "../utils/getClosestProduct";

export async function productPost(req: Request, res: Response) {
  const { type, category, region, name, quantity, price } = req.body;
  const userId = req.user!.sub;

  const product = new Product({
    type,
    category,
    region,
    name,
    quantity,
    price,
    userId,
  });

  const closestProducts = await getClosestProduct(product);
  // @ts-ignore
  product.closestProducts = closestProducts.map((p) => p._id);

  await product.save();

  res.status(201).json({ message: "Product created successfully" });
}
