import { Types } from 'mongoose'

export interface IPaymentRecord {
  _id?: Types.ObjectId
  userId: Types.ObjectId
  cartsIds: Types.ObjectId[]
  paymentSeasonId?: string
  paymentIntent?: string
  totalPrice?:number
  paymentStatus: 'successful' | 'cancelled' | 'pending'
  createdAt?: Date
  updatedAt?: Date
}
