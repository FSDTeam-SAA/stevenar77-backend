import { model, Schema } from "mongoose";
import { IOrder } from "./order.interface";

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "canceled"],
      default: "pending",
    },
    totalPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { timestamps: true, versionKey: false }
);

const order = model<IOrder>("Order", orderSchema);
export default order;
