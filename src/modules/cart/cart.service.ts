import { StatusCodes } from 'http-status-codes'
import AppError from '../../errors/AppError'
import { ICart } from './cart.interface'
import { Cart } from './cart.model'
import { Order } from '../Shop/shop.model'
import Booking from '../trips/booking/booking.model'
import { BookingClass } from '../bookingClass/bookingClass.model'
import { Types } from 'mongoose'
import Trip from '../trips/trip.model'
import Product from '../product/product.model'
import { Class } from '../class/class.model'
import order from '../order/order.model'

const createCartItem = async (payload: ICart) => {
  // If it's a trip and no bookingId is provided, create a Booking first
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
        const product = await Product.findById(itemObjId).select('title images price')
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
        const course = await Class.findById(itemObjId)
          .select('title image price formTitle');
        if (course) {
          details = {
            _id: course._id,
            title: course.title,
            images: course.image,
            price: course.price,
            formTitle: course.formTitle,
          };

          // Populate booking for this course using bookingId
          if (item.bookingId) {
            const booking = await BookingClass.findById(item.bookingId).select(
              'Username email'
            );
            if (booking) {
              details = {
                ...details,
                Username: booking.Username,
                email: booking.email,
              };
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
