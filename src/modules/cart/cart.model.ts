import { model, ObjectId, Schema } from 'mongoose'
import { ICart, CartModel } from './cart.interface'

const cartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId },
    itemId: { type: Schema.Types.ObjectId, required: true },
    type: {
      type: String,
      enum: ['product', 'trip', 'course'],
      required: true,
    },
    price: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'complete'],
    //   default: 'pandaing',
    },
  },
  { timestamps: true, versionKey: false }
)

export const Cart = model<ICart, CartModel>('Cart', cartSchema)
