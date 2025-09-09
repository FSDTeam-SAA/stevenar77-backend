import { model, Schema } from 'mongoose'
import { IClass } from './class.interface'

const classSchema = new Schema<IClass>(
  {
    title: { type: String, required: true },
    image: {
      public_id: { type: String },
      url: { type: String },
    },
    shortDescription: { type: String, required: true },
    features: { type: [String], default: [] },
    price: { type: Number, required: true },
    longDescription: { type: String },
    courseDate: { type: Date, required: true },
    location: { type: String, required: true },
    requiredAge: { type: Number },
    requiredHeight: { type: Number },
    maxDepth: { type: Number },
    courseDuration: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Example of adding a static method if needed
classSchema.statics.findByTitle = async function (title: string) {
  return this.findOne({ title })
}

export const Class = model<IClass>('Class', classSchema)
