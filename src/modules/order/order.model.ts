import { model, Schema } from "mongoose";
import { IOrder } from "./order.interface";

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'canceled', 'paid', 'cancelled'],
      default: 'pending',
    },
    totalPrice: { type: Number, required: true },
    variants: [
      {
        title: { type: String, required: true },
        quantity: { type: Number, required: true },

        _id: false,
      },
    ],

    quantity: { type: Number, required: true },
    orderData: { type: Date, default: Date.now },
    orderTime: { type: Date, default: Date.now },
    color: { type: String },

    images: [
      {
        public_id: { type: String },
        url: { type: String },
        _id: false,
      },
    ],
    // ✅ Add Stripe Payment Intent ID
    stripePaymentIntentId: { type: String },
  },

  { timestamps: true, versionKey: false }
)

const order = model<IOrder>("Order", orderSchema);
export default order;
