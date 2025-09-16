import mongoose, { Model } from "mongoose"

export interface IBookingClass extends Document {
  classId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  status: 'pending' | 'completed' | 'canceled'
  participant: number
  classDate: Date[] // multiple dates allowed
  totalPrice: number
  stripePaymentIntentId?: string
}

export type BookingClassModel = Model<IBookingClass>