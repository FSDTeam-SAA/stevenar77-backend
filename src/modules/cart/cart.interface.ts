import { Model, Types } from 'mongoose'

export interface ICart {
  _id?: string
  userId: Types.ObjectId
  itemId: Types.ObjectId
  type: 'product' | 'trip' | 'course'
  price: number
  status?: 'pending' | 'complete'
}

export type CartModel = Model<ICart>
