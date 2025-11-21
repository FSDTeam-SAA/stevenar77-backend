import { Document, Model, Types } from 'mongoose'

export interface IReviewRating extends Document {
  _id: string
  userId: Types.ObjectId
  classId: Types.ObjectId
  tripId: Types.ObjectId
  productId: Types.ObjectId
  star: number // 1–5
  comment?: string
  purchaseDate: Date
}

export interface ReviewRatingModel extends Model<IReviewRating> {
  customMethod(): void
}
