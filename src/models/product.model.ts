import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide a user ID"],
    },
    action: {
      type: String,
      enum: ["need", "provide"],
      required: [true, "Please specify if you need or provide"],
    },
    productName: {
      type: String,
      required: [true, "Please enter a product name"],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, "Please enter quantity"],
      min: 1,
    },
    price: {
      type: String,
      required: [true, "Please enter price"],
      trim: true,
    },
    condition: {
      type: String,
      trim: true,
    },
    colorModel: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    specifications: {
      type: String,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    shipping: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
