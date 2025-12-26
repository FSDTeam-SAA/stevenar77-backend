import { StatusCodes } from 'http-status-codes'
import { Types } from 'mongoose'
import AppError from '../../errors/AppError'
import { BookingClass } from '../bookingClass/bookingClass.model'
import { Class } from '../class/class.model'
import Product from '../product/product.model'
import Booking from '../trips/booking/booking.model'
import Trip from '../trips/trip.model'
import { ICart } from './cart.interface'
import { Cart } from './cart.model'
import order from '../order/order.model'

const createCartItem = async (payload: ICart) => {
  /**
   * ------------------------
   * TRIP CART ITEM
   * ------------------------
   */
  if (payload.type === 'trip' && !payload.bookingId) {
    const participants = payload.participants || []
    const totalParticipants = participants.length

    const booking = await Booking.create({
      trip: payload.itemId,
      user: payload.userId,
      participants,
      totalPrice: payload.price,
      totalParticipants,
      status: 'pending',
    })

    payload.bookingId = booking._id as Types.ObjectId
  }

  /**
   * ------------------------
   * PRODUCT CART ITEM
   * ------------------------
   */
  if (payload.type === 'product' && !payload.orderId) {
    // console.log("this is product")
    const OrderCreated = await order.create({
      userId: payload.userId,
      productId: payload.itemId,
      totalPrice: payload.price,
      quantity: payload.quantity,
      color: payload.color,
      status: 'pending',

      images: payload.images?.map((url: string) => ({
        url,
      })),
    })
    console.log('created order ', OrderCreated)

    // attach order reference to cart
    payload.itemId = OrderCreated._id as unknown as Types.ObjectId
    payload.productId = OrderCreated.productId as unknown as Types.ObjectId
  }

  /**
   * ------------------------
   * CREATE CART ITEM
   * ------------------------
   */
  const result = await Cart.create(payload)
  return result
}

const getPendingByUser = async (userId: string) => {
  const cartItems = await Cart.find({ userId, status: 'pending' }).sort({
    createdAt: -1,
  })

  const results = await Promise.all(
    cartItems.map(async (item) => {
      let details = null

      // Convert itemId to ObjectId
      const itemObjId = new Types.ObjectId(item.itemId)

      if (item.type === 'product') {
        const product = await Product.findById(item.productId).select(
          'title images price'
        )
        if (product) {
          details = {
            _id: product._id,
            title: product.title,
            images: product.images,
            price: product.price,
          }
        }
      } else if (item.type === 'trip') {
        const trip = await Trip.findById(itemObjId).select('title images price')
        if (trip) {
          details = {
            _id: trip._id,
            title: trip.title,
            images: trip.images,
            price: trip.price,
          }
        }
      } else if (item.type === 'course') {
        const course = await Class.findById(itemObjId).select(
          'title image price formTitle schedule'
        )
        if (course) {
          details = {
            _id: course._id,
            title: course.title,
            images: course.image,
            price: course.price,
            formTitle: course.formTitle,
            schedule: course.schedule,
          }

          // Populate booking for this course using bookingId
          if (item.bookingId) {
            const booking = await BookingClass.findById(item.bookingId).select(
              'Username email classDate '
            )
            if (booking) {
              details = {
                ...details,
                Username: booking.Username,
                email: booking.email,
                classDate: booking.classDate,
              }
            }
          }
        }
      }
      return {
        ...item.toObject(),
        details,
      }
    })
  )

  return results
}

const deleteCartItem = async (cartId: string) => {
  const cart = await Cart.findById(cartId)
  if (!cart) {
    throw new AppError('Cart item not found', StatusCodes.NOT_FOUND)
  }

  await Cart.findByIdAndDelete(cartId)
  return true
}

const cartService = {
  createCartItem,
  getPendingByUser,
  deleteCartItem,
}

export default cartService
