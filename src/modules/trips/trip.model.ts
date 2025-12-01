import { Schema, model } from "mongoose";
import { ITrip } from "./trips.interface";

const TripSchema = new Schema<ITrip>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    maximumCapacity: { type: Number, required: true },
    location: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    index: { type: Number, required: true },
    images: [
      {
        public_id: { type: String },
        url: { type: String },
      },
    ],
  },

  { timestamps: true }
);

const Trip = model<ITrip>("Trip", TripSchema);
export default Trip;
