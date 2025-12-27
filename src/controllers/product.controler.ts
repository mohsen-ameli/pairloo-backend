import { Request, Response } from "express";
import Product from "../models/product.model";
import mongoose from "mongoose";
import { getClosestProducts } from "../utils/getClosestProducts";

export async function productPost(req: Request, res: Response) {
  const { type, category, region, name, quantity, price } = req.body;
  const userId = new mongoose.Types.ObjectId(req.user!.sub);

  const product = new Product({
    type,
    category,
    region,
    name,
    quantity,
    price,
    userId,
  });
  const closestProducts = await getClosestProducts(product);
  product.set("closestProducts", closestProducts);
  await product.save();

  res.status(201).json({ message: "Product created successfully", product });
}
