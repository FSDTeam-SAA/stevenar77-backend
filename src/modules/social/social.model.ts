import mongoose, { Schema, Document } from 'mongoose'

export interface ISocial extends Document {
  facebook: string
  instagram: string
  location: string
  email: string
}

const SocialSchema: Schema = new Schema(
  {
    facebook: {
      type: String,
      required: true,
    },
    instagram: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // Make email unique
    },
    number: {
      type: String,
      required: true,
    }
  },
  { timestamps: true }
)

const Social = mongoose.model<ISocial>('Social', SocialSchema)

export default Social
