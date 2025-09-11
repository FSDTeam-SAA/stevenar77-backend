import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/AppError";
import { User } from "../user/user.model";
import { IOrder } from "./order.interface";
import Product from "../product/product.model";
import order from "./order.model";

const createOrder = async (email: string, payload: IOrder) => {
  const { productId, status, totalPrice, quantity } = payload;

  const user = await User.isUserExistByEmail(email);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  const product = await Product.findById(productId);
  if (!product) throw new AppError("Product not found", StatusCodes.NOT_FOUND);

  if (product.inStock === false)
    throw new AppError("Product is out of stock", StatusCodes.BAD_REQUEST);

  if (product.quantity < quantity)
    throw new AppError(
      "Product quantity is not enough",
      StatusCodes.BAD_REQUEST
    );

  const price = product.price * quantity;

  const result = await order.create({
    userId: user._id,
    productId,
    status,
    totalPrice: price,
    quantity,
    orderData: new Date(),
    orderTime: new Date(),
  });

  await Product.findOneAndUpdate(
    { _id: productId },
    { $inc: { quantity: -quantity } },
    { new: true }
  );

  return result;
};

const getMyOder = async (email: string) => {
  const user = await User.isUserExistByEmail(email);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  const result = await order.find({ userId: user._id }).populate({
    path: "productId",
    select: "title images",
  });
  return result;
};

const orderService = {
  createOrder,
  getMyOder,
};

export default orderService;
