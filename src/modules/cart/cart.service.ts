import { StatusCodes } from 'http-status-codes'
import AppError from '../../errors/AppError'
import { ICart } from './cart.interface'
import { Cart } from './cart.model'
import { Order } from '../Shop/shop.model'
import Booking from '../trips/booking/booking.model'
import { BookingClass } from '../bookingClass/bookingClass.model'

const createCartItem = async (payload: ICart) => {
  const result = await Cart.create(payload)
  return result
}

const getPendingByUser = async (userId: string) => {
  // Get all pending cart items
  const cartItems = await Cart.find({ userId, status: 'pending' }).sort({
    createdAt: -1,
  })

  const results = await Promise.all(
    cartItems.map(async (item) => {
      let details = null

      if (item.type === 'product') {
        details = await Order.findOne({
          userId,
          productId: item.itemId,
        }).populate('productId')
      }

      if (item.type === 'trip') {
        details = await Booking.findOne({
          user: userId,
          trip: item.itemId,
        }).populate('trip')
      }

      if (item.type === 'course') {
        details = await BookingClass.findOne({
          
          userId,
          _id: item.itemId,
        }).populate('classId')
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
