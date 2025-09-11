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

const getMyOder = async (
  email: string,
  page: number = 1,
  limit: number = 10
) => {
  const user = await User.isUserExistByEmail(email);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  const skip = (page - 1) * limit;

  const orders = await order
    .find({ userId: user._id })
    .populate({
      path: "productId",
      select: "title images",
    })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalOrders = await order.countDocuments({ userId: user._id });

  return {
    orders,
    meta: {
      limit,
      page,
      total: totalOrders,
      totalPage: Math.ceil(totalOrders / limit),
    },
  };
};

const getAllOrder = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  // Fetch orders with pagination
  const orders = await order
    .find()
    .populate({
      path: "productId",
      select: "title images",
    })
    .populate("userId", "firstName lastName email image")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 }); // latest orders first

  // Count total orders
  const totalOrders = await order.countDocuments();

  return {
    meta: {
      total: totalOrders,
      page,
      limit,
      totalPage: Math.ceil(totalOrders / limit),
    },
    orders,
  };
};

const orderService = {
  createOrder,
  getMyOder,
  getAllOrder,
};

export default orderService;
