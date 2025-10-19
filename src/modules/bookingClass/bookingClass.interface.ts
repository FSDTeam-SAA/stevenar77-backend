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
  scheduleId:mongoose.Types.ObjectId
  classDate: Date[] // multiple dates allowed
  totalPrice: number
  stripePaymentIntentId?: string
  gender: 'male' | 'female'
  shoeSize: number
  hight: string
  weight: number
  Username: string
  email: string
  phoneNumber: string
  emergencyName: string
  emergencyPhoneNumber: string
  form?: {
    [key: string]: any
    documents?: {
      public_id: string
      url: string
    }[]
  }
}

export type BookingClassModel = Model<IBookingClass>
