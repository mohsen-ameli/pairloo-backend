import { Request, Response } from "express";
import Product from "../models/product.model";

export const createProduct = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.sub;
    const {
      action,
      productName,
      quantity,
      price,
      condition,
      colorModel,
      description,
      specifications,
      reason,
      shipping,
      location,
      notes,
    } = req.body;

    // Validate required fields
    if (!action || !productName || !quantity || !price) {
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    const product = new Product({
      userId,
      action,
      productName,
      quantity,
      price,
      condition,
      colorModel,
      description,
      specifications,
      reason,
      shipping,
      location,
      notes,
    });

    await product.save();

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error: any) {
    console.error("Error creating product:", error);
    return res.status(500).json({
      message: "Error creating product",
      error: error.message,
    });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.sub;

    const products = await Product.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Products retrieved successfully",
      products,
    });
  } catch (error: any) {
    console.error("Error retrieving products:", error);
    return res.status(500).json({
      message: "Error retrieving products",
      error: error.message,
    });
  }
};

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    return res.status(200).json({
      message: "All products retrieved successfully",
      products,
    });
  } catch (error: any) {
    console.error("Error retrieving products:", error);
    return res.status(500).json({
      message: "Error retrieving products",
      error: error.message,
    });
  }
};
