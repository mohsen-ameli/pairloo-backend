import mongoose from "mongoose"
import pointSchema from "./point.model"

export interface LocationType extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  name: string
  state_id: number
  state_code: string
  state_name: string
  country_id: number
  country_code: string
  country_name: string
  location: {
    type: string
    coordinates: [number, number] // [longitude, latitude]
  }
  type: string
  population?: number
  timezone: string
}

const locationSchema = new mongoose.Schema<LocationType>({
  name: { type: String, required: true },
  state_id: { type: Number },
  state_code: { type: String },
  state_name: { type: String },
  country_id: { type: Number },
  country_code: { type: String },
  country_name: { type: String },
  location: {
    type: pointSchema,
    required: true,
  },
  type: { type: String },
  population: { type: Number },
  timezone: { type: String },
})

locationSchema.index({ latitude: "2dsphere", longitude: "2dsphere" })

const Location = mongoose.model<LocationType>("location", locationSchema)
export default Location
