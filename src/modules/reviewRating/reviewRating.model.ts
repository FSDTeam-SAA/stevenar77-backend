import mongoose, { Schema } from 'mongoose'
import {
  IReviewRating,
  ReviewRatingModel,
} from './reviewRating.interface'

const reviewRatingSchema: Schema = new Schema<IReviewRating>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    star: { type: Number, required: true, min: 1, max: 5 }, // rating 1–5
    comment: { type: String, default: '' },
  },
  { timestamps: true }
)

export const ReviewRating = mongoose.model<IReviewRating, ReviewRatingModel>(
  'ReviewRating',
  reviewRatingSchema
)
