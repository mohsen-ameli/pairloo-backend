import { getEmbedding, cosineSimilarity } from "./embedding";
import Product, { ProductType } from "../models/product.model";
import mongoose from "mongoose";

export async function getClosestProducts(product: Partial<ProductType>, K = 5) {
  if (
    !product.category ||
    !product.name ||
    !product.region ||
    !product.price ||
    !product.type
  ) {
    throw new Error(
      "Product must have category, name, region, price, and type"
    );
  }

  const wantedCategoryEmbedding = await getEmbedding(
    `${product.category} ${product.name}`
  );
  const wantedRegionEmbedding = await getEmbedding(product.region);

  const results: {
    score: number;
    item: mongoose.Types.ObjectId;
  }[] = [];

  const products = await Product.find({
    type: product.type === "need" ? "provide" : "need",
    userId: { $ne: product.userId },
  });
  const productPrices = products.map((p) => parseFloat(p.price));
  const maxPrice = Math.max(...productPrices);
  const minPrice = Math.min(...productPrices);

  for (const productInDB of products) {
    const categorySim = cosineSimilarity(
      wantedCategoryEmbedding,
      productInDB.category_name_embedding
    );
    const regionSim = cosineSimilarity(
      wantedRegionEmbedding,
      productInDB.region_embedding
    );
    // Price similarity
    const wantedPrice = parseFloat(product.price);
    const productPrice = parseFloat(productInDB.price);
    const priceDiff = Math.abs(wantedPrice - productPrice);
    const normalizedPriceDiff = priceDiff / (maxPrice - minPrice);
    const priceSim = 1 - normalizedPriceDiff;

    // Multiplicative combination: if any similarity is low, score is low
    const score = categorySim * regionSim * priceSim;
    results.push({ score, item: productInDB._id });
  }

  results.sort((a, b) => b.score - a.score);
  // console.log(`Top ${K} matches:`);
  // for (const { score, item } of results.slice(0, K)) {
  //   console.log(
  //     `Score: ${score.toFixed(4)}, Name: ${item.name}, Category: ${item.category}, Price: ${item.price}, Region: ${item.region}`,
  //   );
  // }

  return results.slice(0, K);
}
