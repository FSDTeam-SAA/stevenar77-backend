import { Types, Model } from 'mongoose'

export interface IAddOn {
  id: number
  title: string
  price: number
}

export interface IMedicalDocument {
  public_id: string
  url: string
}

export interface IBookingClass {
  _id?: Types.ObjectId

  classId: Types.ObjectId
  userId: Types.ObjectId

  participant?: number
  classDate?: Date[]

  medicalDocuments?: IMedicalDocument[]

  form?: Record<string, any> | null

  totalPrice?: number

  status: 'pending' | 'paid' | 'cancelled'

  stripePaymentIntentId?: string

  gender?: 'male' | 'female'
  shoeSize?: number
  hight: string // required
  weight?: number

  Username?: string
  email?: string
  phoneNumber?: string

  emergencyName?: string
  emergencyPhoneNumber?: string

  scheduleId: Types.ObjectId
  age?: number

  address: string
  city: string
  state: string
  postalCode: number

  heightInches: number

  courseTitle: string
  coursePrice: number

  addOns: IAddOn[]
  addOnTotal: number

  createdAt?: Date
  updatedAt?: Date
}
