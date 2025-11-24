import { Model, Types } from 'mongoose'

export interface IParticipant {
  firstName: string
  lastName: string
  email: string
  mobile: number
}


export interface ICart {
  _id?: string
  userId: Types.ObjectId
  itemId: Types.ObjectId
  type: 'product' | 'trip' | 'course'
  price: number
  status?: 'pending' | 'complete'
   participants?: IParticipant[]
     color?: string
  images?: { public_id: string; url: string }[]
  quantity: number

}

export type CartModel = Model<ICart>
