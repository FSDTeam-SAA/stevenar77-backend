import { model, Schema } from 'mongoose'
import { ICart, CartModel, IParticipant } from './cart.interface'

const participantSchema = new Schema<IParticipant>(
  {
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
    email: { type: String, required: false },
    mobile: { type: Number, required: false },
  },
  { _id: false } // Optional: avoids creating separate _id for each participant
)

const cartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId },
    itemId: { type: Schema.Types.ObjectId, required: true },
    bookingId: { type: Schema.Types.ObjectId },
    type: {
      type: String,
      enum: ['product', 'trip', 'course'],
      required: true,
    },
    price: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'complete'],
      default: 'pending',
    },
    participants: {
      type: [participantSchema],
      default: [],
    },
    color: { type: String },
    images: [{ type: String }],

    quantity: { type: Number },
  },

  { timestamps: true, versionKey: false }
)

export const Cart = model<ICart, CartModel>('Cart', cartSchema)
