import { model, Schema } from 'mongoose'
import { IClass } from './class.interface'

// Each individual date in a schedule
const dateSchema = new Schema(
  {
    date: { type: Date, required: true },
    location: { type: String },
    type: { type: String, enum: ['pool', 'islands'], required: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
)

// Each schedule has multiple dates
const scheduleSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    participents: { type: Number, default: 0 },
    totalParticipents: { type: Number, default: 0 },
    sets: [dateSchema],
  },
  { _id: false }
);

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
    isActive: { type: Boolean, default: true },
    index: { type: Number, required: true },
    formTitle: [{ type: String }],
    maxAge: { type: Number },
    minAge: { type: Number },
    location: { type: String },
    addOnce: [
      {
        title: { type: String },
        price: { type: Number },
      },
    ],
    schedule: [scheduleSchema], // array of schedules
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Example static method
classSchema.statics.findByTitle = async function (title: string) {
  return this.findOne({ title })
}

export const Class = model<IClass>('Class', classSchema)
