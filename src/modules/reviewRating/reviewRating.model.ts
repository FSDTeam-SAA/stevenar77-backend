import mongoose, { Schema } from 'mongoose'
import { IReviewRating, ReviewRatingModel } from './reviewRating.interface'

const reviewRatingSchema: Schema = new Schema<IReviewRating>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Facility' },
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip' },
    productId: { type: Schema.Types.ObjectId, ref: 'Shop' },
    star: { type: Number, required: true, min: 1, max: 5 }, // rating 1–5
    comment: { type: String, default: '' },
  },
  { timestamps: true }
)

export const ReviewRating = mongoose.model<IReviewRating, ReviewRatingModel>(
  'ReviewRating',
  reviewRatingSchema
)
