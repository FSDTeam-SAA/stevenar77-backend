import { StatusCodes } from 'http-status-codes'
import mongoose from 'mongoose'
import AppError from '../../errors/AppError'
import { uploadToCloudinary } from '../../utils/cloudinary'
import Product from '../product/product.model'
import { User } from '../user/user.model'
import { IOrder } from './order.interface'
import order from './order.model'
import { Cart } from '../cart/cart.model'

const createOrder = async (
  email: string,
  payload: IOrder,
  files?: Express.Multer.File[]
) => {
  const { productId, quantity, color } = payload

  const user = await User.isUserExistByEmail(email)
  if (!user) throw new AppError('User not found', StatusCodes.NOT_FOUND)

  const product = await Product.findById(productId)
  if (!product) throw new AppError('Product not found', StatusCodes.NOT_FOUND)

  if (product.inStock === false)
    throw new AppError('Product is out of stock', StatusCodes.BAD_REQUEST)

  const price = product.price * quantity

  // **Handle images**
  const images: { public_id: string; url: string }[] = []

  if (files && files.length > 0) {
    for (const file of files) {
      const uploadResult = await uploadToCloudinary(file.path, 'orders')
      if (uploadResult) {
        images.push({
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
        })
      }
    }
  } else {
    throw new AppError(
      'At least one image is required',
      StatusCodes.BAD_REQUEST
    )
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
    status: 'pending',
  })

  const cart = await Cart.create({
    userId: user._id,
    itemId: result.productId, // order booking Id
    bookingId: result._id,
    type: 'product',
    price,
    status: 'pending',
  })

  //  Update product stock
  const updatedProduct = await Product.findOneAndUpdate(
    { _id: productId },
    { $inc: { quantity: -quantity } },
    { new: true }
  )

  if (updatedProduct && updatedProduct.quantity <= 0) {
    await Product.findByIdAndUpdate(productId, { inStock: false })
  }

  return { cart }
}

const getMyOder = async (
  email: string,
  page: number = 1,
  limit: number = 10
) => {
  const user = await User.isUserExistByEmail(email)
  if (!user) throw new AppError('User not found', StatusCodes.NOT_FOUND)

  const skip = (page - 1) * limit

  const orders = await order
    .find({ userId: user._id })
    .populate({
      path: 'productId',
      select: 'title images',
    })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })

  const totalOrders = await order.countDocuments({ userId: user._id })

  return {
    orders,
    meta: {
      limit,
      page,
      total: totalOrders,
      totalPage: Math.ceil(totalOrders / limit),
    },
  }
}

const getAllOrder = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit

  // Fetch orders with pagination
  const orders = await order
    .find()
    .populate({
      path: 'productId',
      select: 'title images',
    })
    .populate('userId', 'firstName lastName email image')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 }) // latest orders first

  // Count total orders
  const totalOrders = await order.countDocuments()

  return {
    meta: {
      total: totalOrders,
      page,
      limit,
      totalPage: Math.ceil(totalOrders / limit),
    },
    orders,
  }
}

const orderCancelByUser = async (email: string, orderId: string) => {
  const user = await User.isUserExistByEmail(email)
  if (!user) throw new AppError('User not found', StatusCodes.NOT_FOUND)

  const orderProduct = await order.findById(orderId)
  if (!orderProduct)
    throw new AppError('Order not found', StatusCodes.NOT_FOUND)

  const result = await order.findOneAndUpdate(
    { _id: orderId },
    { status: 'cancelled' },
    { new: true }
  )

  const updatedProduct = await Product.findOneAndUpdate(
    { _id: orderProduct.productId },
    { $inc: { quantity: orderProduct.quantity } },
    { new: true }
  )

  if (updatedProduct && updatedProduct.quantity > 0) {
    await Product.findByIdAndUpdate(orderProduct.productId, { inStock: true })
  }

  return result
}

const updateOrderStatus = async (orderId: string, status: string) => {
  if (status !== 'pending' && status !== 'completed' && status !== 'canceled') {
    throw new AppError('Invalid status value', StatusCodes.BAD_REQUEST)
  }

  const orderProduct = await order.findById(orderId)
  if (!orderProduct) {
    throw new AppError('Order not found', StatusCodes.NOT_FOUND)
  }

  if (orderProduct.status === 'canceled') {
    throw new AppError('Order already canceled', StatusCodes.BAD_REQUEST)
  }

  if (orderProduct.status === 'completed') {
    throw new AppError('Order already completed', StatusCodes.BAD_REQUEST)
  }

  // Update order status
  const result = await order.findOneAndUpdate(
    { _id: orderId },
    { status },
    { new: true }
  )

  // If status is "canceled", restore product quantity
  if (status === 'canceled') {
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: orderProduct.productId },
      { $inc: { quantity: orderProduct.quantity } },
      { new: true }
    )

    // If product stock was 0, set inStock = true again
    if (updatedProduct && updatedProduct.quantity > 0) {
      await Product.findByIdAndUpdate(orderProduct.productId, {
        inStock: true,
      })
    }
  }

  return result
}

const getAllPaid = async () => {
  const paidOrders = await order.find({ status: 'paid' })
  // //console.log("asa",paidOrders);
  if (!paidOrders || paidOrders.length === 0) {
    throw new AppError('No paid orders found', StatusCodes.NOT_FOUND)
  }
  const totalPrice = paidOrders.reduce((sum, ord) => sum + ord.totalPrice, 0)
  return {
    orders: paidOrders,
    totalPrice,
  }
}

const deleteAllOrderClass = async (orderIds: string) => {
  let deletedOrder
  let session

  try {
    session = await mongoose.startSession()
    session.startTransaction()

    if (orderIds) {
      const idsArray = Array.isArray(orderIds)
        ? orderIds
        : (orderIds as string).split(',')

      // Validate and convert to ObjectId
      const validObjectIds = []
      for (const id of idsArray) {
        if (mongoose.Types.ObjectId.isValid(id as string)) {
          validObjectIds.push(new mongoose.Types.ObjectId(id as string))
        } else {
          throw new AppError(`Invalid order ID: ${id}`, StatusCodes.BAD_REQUEST)
        }
      }

      const existingOrders = await order
        .find({
          _id: { $in: validObjectIds },
        })
        .session(session)

      for (const id of validObjectIds) {
        const singleBooking = await order.findById(id).session(session)

        if (!singleBooking) {
          throw new AppError(`Order not found`, StatusCodes.NOT_FOUND)
        }
      }

      if (existingOrders.length === 0) {
        await order.find({}).select('_id').limit(10)
        throw new AppError(`No order found`, StatusCodes.NOT_FOUND)
      }

      for (const singleOrder of existingOrders) {
        if (singleOrder.status === 'pending') {
          throw new AppError(
            `You can't delete a pending Order.`,
            StatusCodes.FORBIDDEN
          )
        }
      }

      // Delete the found bookings
      deletedOrder = await order
        .deleteMany({
          _id: { $in: validObjectIds },
        })
        .session(session)
    } else {
      throw new AppError('Please check and try again', StatusCodes.BAD_REQUEST)
    }

    await session.commitTransaction()

    return deletedOrder
  } catch (error) {
    if (session) {
      await session.abortTransaction()
    }
    throw error
  } finally {
    if (session) {
      session.endSession()
    }
  }
}

const orderService = {
  createOrder,
  getMyOder,
  getAllOrder,
  orderCancelByUser,
  updateOrderStatus,
  getAllPaid,
  deleteAllOrderClass,
}

export default orderService
