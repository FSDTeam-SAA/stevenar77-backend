import { StatusCodes } from 'http-status-codes'
import AppError from '../../errors/AppError'
import { User } from '../user/user.model'
import { IOrder } from './order.interface'
import Product from '../product/product.model'
import order from './order.model'
import { uploadToCloudinary } from '../../utils/cloudinary'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
})

const createOrder = async (
  email: string,
  payload: IOrder,
  files?: Express.Multer.File[]
) => {
  const { productId, quantity, color } = payload
  // console.log("email",email);
  const user = await User.isUserExistByEmail(email)

  if (!user) throw new AppError('User not found', StatusCodes.NOT_FOUND)

  const product = await Product.findById(productId)
  if (!product) throw new AppError('Product not found', StatusCodes.NOT_FOUND)

  if (product.inStock === false)
    throw new AppError('Product is out of stock', StatusCodes.BAD_REQUEST)

  if (product.quantity < quantity)
    throw new AppError(
      'Product quantity is not enough',
      StatusCodes.BAD_REQUEST
    )

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

  const result = await order.create({
    userId: user._id,
    productId,
    totalPrice: price,
    quantity,
    images,
    color,
    orderData: new Date(),
    orderTime: new Date(),
  })

  const updatedProduct = await Product.findOneAndUpdate(
    { _id: productId },
    { $inc: { quantity: -quantity } },
    { new: true }
  )

  if (updatedProduct && updatedProduct.quantity <= 0) {
    await Product.findByIdAndUpdate(productId, { inStock: false })
  }

  // Step 2: Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.title,
            images: images.map((img) => img.url),
          },
          unit_amount: product.price * 100, // cents
        },
        quantity,
      },
    ],
    success_url: process.env.product_frontend_url_success,
    cancel_url: process.env.product_frontend_url_cancel,
    metadata: {
      orderId: result._id.toString(),
      productId: productId.toString(),
      quantity: quantity.toString(),
    },
  })

  return { order: result, sessionUrl: session.url }
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
  // console.log("asa",paidOrders);
  if (!paidOrders || paidOrders.length === 0) {
    throw new AppError('No paid orders found', StatusCodes.NOT_FOUND)
  }
  const totalPrice = paidOrders.reduce((sum, ord) => sum + ord.totalPrice, 0)
  return {
    orders: paidOrders,
    totalPrice,
  }
}

const orderService = {
  createOrder,
  getMyOder,
  getAllOrder,
  orderCancelByUser,
  updateOrderStatus,
  getAllPaid,
}

export default orderService
