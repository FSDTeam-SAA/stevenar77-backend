import { Schema, model } from "mongoose";
import { IPaymentRecord } from "./paymentRecord.interface";

const paymentRecordSchema = new Schema<IPaymentRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    totalPrice:{type:String},
    cartsIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Cart",
        required: true,
      },
    ],
    paymentSeasonId: {
      type: String,
    },
    paymentIntent: {
      type: Number,
    },
    paymentStatus: {
      type: String,
      enum: ["successful", "cancelled", "pending"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const PaymentRecord = model<IPaymentRecord>(
  "PaymentRecord",
  paymentRecordSchema
);
