import mongoose, { Schema, Document } from 'mongoose';

export interface ILocation {
  _id: number;
  name: string;
  state_id: number;
  state_code: string;
  state_name: string;
  country_id: number;
  country_code: string;
  country_name: string;
  latitude: string;
  longitude: string;
  native: string;
  type: string;
  level?: string | null;
  parent_id?: number | null;
  population?: number;
  timezone: string;
  translations?: object;
  wikiDataId?: string;
  state?: any;
  country?: any;
  location?: object;
}

const LocationSchema: Schema = new Schema({
  _id: { type: Number, required: true },
  name: { type: String, required: true },
  state_id: { type: Number },
  state_code: { type: String },
  state_name: { type: String },
  country_id: { type: Number },
  country_code: { type: String },
  country_name: { type: String },
  latitude: { type: String },
  longitude: { type: String },
  natiave: { type: String },
  type: { type: String },
  level: { type: String, default: null },
  parent_id: { type: Number, default: null },
  population: { type: Number },
  timezone: { type: String },
  translations: { type: Object },
  wikiDataId: { type: String },
  state: { type: Schema.Types.Mixed },
  country: { type: Schema.Types.Mixed },
  location: { type: Object },
}, { collection: 'locations' });

export default mongoose.model<ILocation & Document>(
  'Location',
  LocationSchema
);
