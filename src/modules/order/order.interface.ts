import { Types } from "mongoose";

export interface IOrder {
  _id: string;
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  status: string;
  totalPrice: number;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}
