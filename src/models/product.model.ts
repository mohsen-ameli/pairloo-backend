import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    closestProducts: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "product",
      required: false,
    },
    type: {
      type: String,
      enum: ["need", "provide"],
      required: [true, ""],
      unique: false,
    },
    category: {
      type: String,
      required: [true, ""],
      unique: false,
    },
    name: {
      type: String,
      required: [true, ""],
      unique: false,
    },
    quantity: {
      type: String,
      required: [true, ""],
      unique: false,
    },
    price: {
      type: String,
      required: [true, ""],
      unique: false,
    },
    region: {
      type: String,
      required: [true, ""],
      unique: false,
    },
    category_name_embedding: {
      type: [Number],
      required: true,
    },
    region_embedding: {
      type: [Number],
      required: true,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("product", productSchema);

export type ProductType = mongoose.InferSchemaType<typeof productSchema>;

export default Product;
