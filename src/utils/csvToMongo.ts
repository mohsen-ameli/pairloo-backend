import fs from "fs";
import csv from "csv-parser";
import { Country, City } from "country-state-city";
import { getEmbedding } from "./embedding";
import Product, { ProductType } from "../models/product.model";
import User from "../models/user.model";

const CSV_FILE = "products_dataset.csv";
const ROWS_TO_PROCESS = 100;

// This function reads a CSV file of products, generates embeddings, and stores them in MongoDB
// the CSV_FILE above should be placed in the root directory of the project
// I have made a route for this in server.ts at /pop-mongo
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
    const entry: Partial<ProductType> = {
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
      `${entry.category} ${entry.name}`,
    );
    entry.region_embedding = await getEmbedding(entry.region);
    data.push(entry);
  }

  // Store in MongoDB
  await Product.deleteMany({});
  await Product.insertMany(data);
}

function readCsvToObjects(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const records: any[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => records.push(data))
      .on("end", () => resolve(records))
      .on("error", (err) => reject(err));
  });
}

function getRandomRegion(): string {
  try {
    const countries = Country.getAllCountries();
    if (countries.length === 0) return "Toronto, Canada";
    const country = countries[Math.floor(Math.random() * countries.length)];
    const cities = City.getCitiesOfCountry(country.isoCode);
    if (!cities || cities.length === 0) return getRandomRegion();
    const city = cities[Math.floor(Math.random() * cities.length)];
    return `${city.name}, ${country.name}`;
  } catch {
    // If anything goes wrong, try again
    return getRandomRegion();
  }
}
