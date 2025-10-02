import mongoose, { Model } from 'mongoose'

export interface IBookingClass extends Document {
  classId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  status: 'pending' | 'completed' | 'canceled'
  medicalDocuments: {
    public_id: string
    url: string
  }[]
  participant: number
  classDate: Date[] // multiple dates allowed
  totalPrice: number
  stripePaymentIntentId?: string
  gender: 'male' | 'female'
  shoeSize: number
  hight: number
  weight: number
   form?: {
    [key: string]: any
    documents?: {
      public_id: string
      url: string
    }[]
  }
}

export type BookingClassModel = Model<IBookingClass>
