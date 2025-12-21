import { getEmbedding, cosineSimilarity } from "./embedding";
import Product, { ProductType } from "../models/product.model";

export async function getClosestProduct(
  product: {
    category: string;
    name: string;
    region: string;
    price: string;
  },
  K = 5
) {
  const wantedCategoryEmbedding = await getEmbedding(
    `${product.category} ${product.name}`
  );
  const wantedRegionEmbedding = await getEmbedding(product.region);

  const results: {
    score: number;
    productInDB: ProductType;
  }[] = [];

  const products = await Product.find();

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
    const price1 = parseFloat(product.price);
    const price2 = parseFloat(productInDB.price);
    const priceSim = Math.exp(-Math.abs(price1 - price2) / 10);

    // Weighted combination
    const score = 0.4 * categorySim + 0.3 * regionSim + 0.3 * priceSim;
    results.push({ score, productInDB });
  }

  results.sort((a, b) => b.score - a.score);
  console.log(`Top ${K} matches:`);
  for (const { score, productInDB } of results.slice(0, K)) {
    console.log(
      `Score: ${score.toFixed(4)}, Name: ${productInDB.name}, Category: ${productInDB.category}, Price: ${productInDB.price}, Region: ${productInDB.region}`
    );
  }

  return results.slice(0, K).map((r) => r.productInDB);
}
