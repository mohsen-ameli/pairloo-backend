import { readCsvToObjects } from "./csvReader";
import { getRandomRegion } from "./randomRegion";
import { getEmbedding } from "./embedding";
import Product, { ProductType } from "../models/product.model";
import User from "../models/user.model";

const CSV_FILE = "products_dataset.csv";
const ROWS_TO_PROCESS = 100;

export async function csvToMongo() {
  const products = await readCsvToObjects(CSV_FILE);
  let i = 0;
  const data = [];

  const user = await User.findOne();

  for (const product of products) {
    if (i > ROWS_TO_PROCESS) {
      break;
    }
    i++;
    const entry: ProductType = {
      type: "provide",
      userId: user!._id,
      name: product["Product Name"],
      category: product["Product Category"],
      quantity: product["Units Sold"],
      price: product["Unit Price"],
      region: product["Region"],
      category_name_embedding: [],
      region_embedding: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    entry.region = getRandomRegion();
    entry.category_name_embedding = await getEmbedding(
      `${entry.category} ${entry.name}`
    );
    entry.region_embedding = await getEmbedding(entry.region);
    data.push(entry);
  }

  // Store in MongoDB
  await Product.deleteMany({});
  await Product.insertMany(data);
}
