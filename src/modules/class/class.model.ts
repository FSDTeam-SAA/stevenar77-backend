import { model, Schema } from "mongoose";
import { IClass } from "./class.interface";

const classSchema = new Schema<IClass>(
  {
    title: { type: String, required: true },
    image: {
      public_id: { type: String },
      url: { type: String },
    },
    description: { type: String },
    price: { type: [Number], required: true },
    courseIncludes: { type: [String], required: true },
    duration: { type: String, required: true },
    totalReviews: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    totalParticipates: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Example of adding a static method if needed
classSchema.statics.findByTitle = async function (title: string) {
  return this.findOne({ title });
};

export const Class = model<IClass>("Class", classSchema);
