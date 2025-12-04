/* eslint-disable prefer-const */
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import AppError from "../../errors/AppError";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { Cart } from "../cart/cart.model";
import { PaymentRecord } from "../cart/paymentRecords.model";
import { Class } from "../class/class.model";
import Product from "../product/product.model";
import Trip from "../trips/trip.model";
import { User } from "../user/user.model";
import { IOrder } from "./order.interface";
import order from "./order.model";

const createOrder = async (
  email: string,
  payload: IOrder,
  files?: Express.Multer.File[]
) => {
  const { productId, quantity, color } = payload;

  const user = await User.isUserExistByEmail(email);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  const product = await Product.findById(productId);
  if (!product) throw new AppError("Product not found", StatusCodes.NOT_FOUND);

  if (product.inStock === false)
    throw new AppError("Product is out of stock", StatusCodes.BAD_REQUEST);

  const price = product.price * quantity;

  // **Handle images**
  const images: { public_id: string; url: string }[] = [];

  if (files && files.length > 0) {
    for (const file of files) {
      const uploadResult = await uploadToCloudinary(file.path, "orders");
      if (uploadResult) {
        images.push({
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
        });
      }
    }
  } else {
    throw new AppError(
      "At least one image is required",
      StatusCodes.BAD_REQUEST
    );
  }

  // Create order in DB
  const result = await order.create({
    userId: user._id,
    productId,
    totalPrice: price,
    quantity,
    images,
    color,
    orderData: new Date(),
    orderTime: new Date(),
    status: "pending",
  });

  const cart = await Cart.create({
    userId: user._id,
    itemId: result.productId, // order booking Id
    bookingId: result._id,
    type: "product",
    price,
    status: "pending",
  });

  //  Update product stock
  const updatedProduct = await Product.findOneAndUpdate(
    { _id: productId },
    { $inc: { quantity: -quantity } },
    { new: true }
  );

  if (updatedProduct && updatedProduct.quantity <= 0) {
    await Product.findByIdAndUpdate(productId, { inStock: false });
  }

  return { cart };
};

const getMyOrder = async (email: string, page = 1, limit = 10) => {
  const user = await User.isUserExistByEmail(email);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  const skip = (page - 1) * limit;

  const totalItems = await PaymentRecord.countDocuments({ userId: user._id });

  const payments = await PaymentRecord.find({ userId: user._id })
    .populate("userId", "firstName lastName email image")
    .populate({
      path: "cartsIds",
      select: "quantity itemId type",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  for (const payment of payments) {
    const carts = payment.cartsIds as any[];

    for (const cart of carts) {
      const id = cart.itemId?.toString();
      if (!id) continue;

      let item =
        (await Class.findById(id).select("title price image")) ||
        (await Trip.findById(id).select("title price images")) ||
        (await Product.findById(id).select("title price images"));

      if (!item) {
        cart.item = null;
        continue;
      }

      let finalImage: string | null = null;

      // Class: image = { public_id, url }
      if ("image" in item && item.image) {
        if (typeof item.image === "string") {
          finalImage = item.image;
        } else if (item.image.url) {
          finalImage = item.image.url;
        }
      }

      //  Trip/Product: images = [{ public_id, url }]
      if ("images" in item && Array.isArray(item.images)) {
        if (item.images.length > 0) {
          const firstImg = item.images[0];
          if (typeof firstImg === "string") {
            finalImage = firstImg;
          } else if (firstImg.url) {
            finalImage = firstImg.url;
          }
        }
      }

      cart.item = {
        title: item.title,
        price: item.price,
        image: finalImage,
      };
    }
  }

  return {
    data: payments,
    meta: {
      limit,
      page,
      total: totalItems,
      totalPage: Math.ceil(totalItems / limit),
    },
  };
};

const getAllOrder = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  // 1. Count total PaymentRecords
  const totalPayments = await PaymentRecord.countDocuments();

  // 2. Load payments + cartsIds (populated)
  const payments = await PaymentRecord.find({ paymentStatus: "successful" })
    .populate("userId", "firstName lastName email image")
    .populate({
      path: "cartsIds",
      select: "quantity images itemId type",
    })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();

  // 3. Attach item (title + price + image)
  for (const payment of payments) {
    const carts = payment.cartsIds as any[];

    for (const cart of carts) {
      const id = cart.itemId?.toString();
      if (!id) continue;

      let item =
        (await Class.findById(id).select("title price image")) ||
        (await Trip.findById(id).select("title price images")) ||
        (await Product.findById(id).select("title price images"));

      if (!item) {
        cart.item = null;
        continue;
      }

      let finalImage: string | null = null;

      // ⭐ Class: image = { public_id, url }
      if ("image" in item && item.image) {
        if (typeof item.image === "string") {
          finalImage = item.image;
        } else if (item.image.url) {
          finalImage = item.image.url;
        }
      }

      // ⭐ Trip/Product: images = [{ public_id, url }]
      if ("images" in item && Array.isArray(item.images)) {
        if (item.images.length > 0) {
          const firstImg = item.images[0];
          if (typeof firstImg === "string") {
            finalImage = firstImg;
          } else if (firstImg.url) {
            finalImage = firstImg.url;
          }
        }
      }

      // Attach final item info
      cart.item = {
        title: item.title,
        price: item.price,
        image: finalImage,
      };
    }
  }

  // 4. Return response
  return {
    meta: {
      total: totalPayments,
      page,
      limit,
      totalPage: Math.ceil(totalPayments / limit),
    },
    data: payments,
  };
};

const orderCancelByUser = async (email: string, orderId: string) => {
  const user = await User.isUserExistByEmail(email);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  const orderProduct = await order.findById(orderId);
  if (!orderProduct)
    throw new AppError("Order not found", StatusCodes.NOT_FOUND);

  const result = await order.findOneAndUpdate(
    { _id: orderId },
    { status: "cancelled" },
    { new: true }
  );

  const updatedProduct = await Product.findOneAndUpdate(
    { _id: orderProduct.productId },
    { $inc: { quantity: orderProduct.quantity } },
    { new: true }
  );

  if (updatedProduct && updatedProduct.quantity > 0) {
    await Product.findByIdAndUpdate(orderProduct.productId, { inStock: true });
  }

  return result;
};

const updateOrderStatus = async (orderId: string, status: string) => {
  if (status !== "pending" && status !== "completed" && status !== "canceled") {
    throw new AppError("Invalid status value", StatusCodes.BAD_REQUEST);
  }

  const orderProduct = await order.findById(orderId);
  if (!orderProduct) {
    throw new AppError("Order not found", StatusCodes.NOT_FOUND);
  }

  if (orderProduct.status === "canceled") {
    throw new AppError("Order already canceled", StatusCodes.BAD_REQUEST);
  }

  if (orderProduct.status === "completed") {
    throw new AppError("Order already completed", StatusCodes.BAD_REQUEST);
  }

  // Update order status
  const result = await order.findOneAndUpdate(
    { _id: orderId },
    { status },
    { new: true }
  );

  // If status is "canceled", restore product quantity
  if (status === "canceled") {
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: orderProduct.productId },
      { $inc: { quantity: orderProduct.quantity } },
      { new: true }
    );

    // If product stock was 0, set inStock = true again
    if (updatedProduct && updatedProduct.quantity > 0) {
      await Product.findByIdAndUpdate(orderProduct.productId, {
        inStock: true,
      });
    }
  }

  return result;
};

const getAllPaid = async () => {
  const paidOrders = await order.find({ status: "paid" });
  // //console.log("asa",paidOrders);
  if (!paidOrders || paidOrders.length === 0) {
    throw new AppError("No paid orders found", StatusCodes.NOT_FOUND);
  }
  const totalPrice = paidOrders.reduce((sum, ord) => sum + ord.totalPrice, 0);
  return {
    orders: paidOrders,
    totalPrice,
  };
};

const deleteAllOrderClass = async (orderIds: string) => {
  let deletedOrder;
  let session;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    if (orderIds) {
      const idsArray = Array.isArray(orderIds)
        ? orderIds
        : (orderIds as string).split(",");

      // Validate and convert to ObjectId
      const validObjectIds = [];
      for (const id of idsArray) {
        if (mongoose.Types.ObjectId.isValid(id as string)) {
          validObjectIds.push(new mongoose.Types.ObjectId(id as string));
        } else {
          throw new AppError(
            `Invalid order ID: ${id}`,
            StatusCodes.BAD_REQUEST
          );
        }
      }

      const existingOrders = await order
        .find({
          _id: { $in: validObjectIds },
        })
        .session(session);

      for (const id of validObjectIds) {
        const singleBooking = await order.findById(id).session(session);

        if (!singleBooking) {
          throw new AppError(`Order not found`, StatusCodes.NOT_FOUND);
        }
      }

      if (existingOrders.length === 0) {
        await order.find({}).select("_id").limit(10);
        throw new AppError(`No order found`, StatusCodes.NOT_FOUND);
      }

      for (const singleOrder of existingOrders) {
        if (singleOrder.status === "pending") {
          throw new AppError(
            `You can't delete a pending Order.`,
            StatusCodes.FORBIDDEN
          );
        }
      }

      // Delete the found bookings
      deletedOrder = await order
        .deleteMany({
          _id: { $in: validObjectIds },
        })
        .session(session);
    } else {
      throw new AppError("Please check and try again", StatusCodes.BAD_REQUEST);
    }

    await session.commitTransaction();

    return deletedOrder;
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

const orderService = {
  createOrder,
  getMyOder: getMyOrder,
  getAllOrder,
  orderCancelByUser,
  updateOrderStatus,
  getAllPaid,
  deleteAllOrderClass,
};

export default orderService;
