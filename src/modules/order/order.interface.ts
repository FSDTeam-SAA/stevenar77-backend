import { Types } from "mongoose";

export interface IOrder {
  _id: string;
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  status: string;
  totalPrice: number;
  quantity: number;
  orderData: Date;
  orderTime: Date;
  createdAt: Date;
  updatedAt: Date;
  color:string,
  stripePaymentIntentId?: string
   images: { public_id: string; url: string }[];
     variants?: {
    title: string;      
    quantity: number;  
       
}
}
