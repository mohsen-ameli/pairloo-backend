import fs from "fs";
import csv from "csv-parser";

export function readCsvToObjects(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const records: any[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => records.push(data))
      .on("end", () => resolve(records))
      .on("error", (err) => reject(err));
  });
}
