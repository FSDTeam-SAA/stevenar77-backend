import catchAsync from '../../utils/catchAsync'
import sendResponse from '../../utils/sendResponse'
import cartService from './cart.service'
import { StatusCodes } from 'http-status-codes'
import { PaymentRecord } from './paymentRecords.model'
import Stripe from 'stripe'
import { User } from '../user/user.model'
import AppError from '../../errors/AppError'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
})

const createCartItem = catchAsync(async (req, res) => {
  const result = await cartService.createCartItem(req.body)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Item added to cart successfully',
    data: result,
  })
})

const getPendingByUser = catchAsync(async (req, res) => {
  const { userId } = req.params

  const result = await cartService.getPendingByUser(userId)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Pending cart items fetched successfully',
    data: result,
  })
})

const deleteCartItem = catchAsync(async (req, res) => {
  const { cartId } = req.params

  await cartService.deleteCartItem(cartId)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Cart item deleted successfully',
  })
})

const cartItemsPayment = catchAsync(async (req, res) => {
  const { cartsIds, totalPrice, userId } = req.body

  // 1. Validate input
  if (!cartsIds?.length || !totalPrice || !userId) {
    throw new AppError(
      'Missing required fields: cartsIds, totalPrice, userId',
      400
    )
  }

  // Get user email
  const user = await User.findById(userId).select('email')
  if (!user) {
    throw new AppError('User not found', 404)
  }

  // Create PaymentRecord in DB
  const paymentRecord = await PaymentRecord.create({
    cartsIds,
    totalPrice,
    userId,
    paymentStatus: 'pending',
  })

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Cart Payment',
          },
          unit_amount: totalPrice * 100,
        },
        quantity: 1,
      },
    ],
    success_url: process.env.FRONTEND_URL_SUCCESS,
    cancel_url: process.env.FRONTEND_URL_CANCEL,
    metadata: {
      paymentRecordId: paymentRecord._id.toString(),
    },
  })

  // Save session ID in paymentRecord
  paymentRecord.paymentSeasonId = session.id
  await paymentRecord.save()

  // Response
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Checkout session created successfully',
    data: { sessionUrl: session.url },
  })
})

const cartController = {
  createCartItem,
  getPendingByUser,
  deleteCartItem,
  cartItemsPayment,
}

export default cartController
