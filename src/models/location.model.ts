import mongoose, { Schema, Document } from 'mongoose';

export interface LocationType {
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
  type: string;
  population?: number;
  timezone: string;
}

const LocationSchema: Schema = new Schema({
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

}, { collection: 'locations' });

export default mongoose.model<LocationType & Document>(
  'Location',
  LocationSchema
);
