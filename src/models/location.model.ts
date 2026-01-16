import mongoose from "mongoose";

export interface LocationType extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  state_id: number;
  state_code: string;
  state_name: string;
  country_id: number;
  country_code: string;
  country_name: string;
  latitude: string;
  longitude: string;
  type: string;
  population?: number;
  timezone: string;
}

const locationSchema = new mongoose.Schema<LocationType>({
  name: { type: String, required: true },
  state_id: { type: Number },
  state_code: { type: String },
  state_name: { type: String },
  country_id: { type: Number },
  country_code: { type: String },
  country_name: { type: String },
  latitude: { type: String },
  longitude: { type: String },
  type: { type: String },
  timezone: { type: String },
});

export default mongoose.model<LocationType>("Location", locationSchema);