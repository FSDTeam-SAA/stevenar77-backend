import { StatusCodes } from 'http-status-codes'
import AppError from '../../errors/AppError'
import { ICart } from './cart.interface'
import { Cart } from './cart.model'
import { Order } from '../Shop/shop.model'
import Booking from '../trips/booking/booking.model'
import { BookingClass } from '../bookingClass/bookingClass.model'
import { Types } from 'mongoose'

const createCartItem = async (payload: ICart) => {
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
        details = await Order.findOne({
          userId: new Types.ObjectId(userId),
          productId: itemObjId,
        }).populate('productId')
      } else if (item.type === 'trip') {
        details = await Booking.findOne({
          user: new Types.ObjectId(userId),
          trip: itemObjId,
        }).populate('trip')
      } else if (item.type === 'course') {
        details = await BookingClass.findOne({
          userId: new Types.ObjectId(userId),
          _id: itemObjId,
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
