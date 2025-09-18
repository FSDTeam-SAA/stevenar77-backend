// models/Order.ts
import { Schema, model, Document, Types } from "mongoose";

interface OrderItem {
  itemReferenceId?: string;
  productUid: string;
  quantity: number;
  previews?: {
    type: string;
    url: string;
  }[];
   files?: {     
    type: string; 
    url: string;
  }[];
}

interface ShipmentInfo {
  shipmentMethodUid?: string;
  shipmentMethodName?: string;
  trackingCode?: string;
  trackingUrl?: string;
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
}

interface ShippingAddress {
  firstName?: string;
  lastName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postCode: string;
  country: string;
  email: string;
  phone?: string;
}

interface Receipt {
  type: string;
  title: string;
  price: number;
  priceInclVat?: number;
  currency: string;
}

interface PaymentInfo {
  provider: string; // stripe | paypal | flutterwave
  transactionId: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "refunded";
}

export interface ShopDocument extends Document {
  orderReferenceId: string;
  user: Types.ObjectId; // ref to User
  gelatoOrderId?: string;
  orderType: "draft" | "order";

  currency: string;
  financialStatus: "pending" | "paid" | "failed" | "refunded";
  fulfillmentStatus:
    | "draft"
    | "submitted"
    | "printed"
    | "shipped"
    | "delivered"
    | "cancelled";

  items: OrderItem[];
  shipment?: ShipmentInfo;
  shippingAddress: ShippingAddress;
  receipts?: Receipt[];

  payment?: PaymentInfo;
}

const shopSchema = new Schema<ShopDocument>(
  {
    orderReferenceId: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    gelatoOrderId: { type: String },
    orderType: { type: String, enum: ["draft", "order"], default: "draft" },
 
    currency: { type: String, default: "USD" },
    financialStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    fulfillmentStatus: {
      type: String,
      enum: ["draft","created", "submitted", "printed", "shipped", "delivered", "cancelled"],
      default: "draft",
    },

    items: [
      {
        itemReferenceId: String,
        productUid: { type: String, required: true },
        quantity: { type: Number, required: true },
        previews: [{ type: { type: String }, url: String }],
         files: [{ type: { type: String }, url: String }],
      },
    ],

    shipment: {
      shipmentMethodUid: String,
      shipmentMethodName: String,
      trackingCode: String,
      trackingUrl: String,
      minDeliveryDays: Number,
      maxDeliveryDays: Number,
    },

    shippingAddress: {
      firstName: String,
      lastName: String,
      addressLine1: { type: String, required: true },
      addressLine2: String,
      city: { type: String, required: true },
      state: String,
      postCode: { type: String, required: true },
      country: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
    },

    receipts: [
      {
        type: String,
        title: String,
        price: Number,
        priceInclVat: Number,
        currency: String,
      },
    ],

    payment: {
      provider: String,
      transactionId: String,
      amount: Number,
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
    },
  },
  { timestamps: true }
);

export const Order = model<ShopDocument>("Shop", shopSchema);
