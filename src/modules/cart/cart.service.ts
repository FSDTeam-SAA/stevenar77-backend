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
    const itemObjId = new Types.ObjectId(item.itemId);

 if (item.type === 'product') {
        const order = await Order.findOne({
          userId: new Types.ObjectId(userId),
          productId: itemObjId,
        });

        if (order) {
          // read product id via mongoose Document.get to avoid TypeScript property errors;
          // support either 'productId' or 'product' field names on the Order document
          const productId = order.get('productId') ?? order.get('product') ?? order.get('product_id')
          const product = await Product.findById(productId).select('title images price')
          details = {
            _id: order._id,
            title: product?.title,
            images: product?.images,
            price: product?.price,
          };
        }

} else if (item.type === 'trip') {
  const booking = await Booking.findOne({
    user: new Types.ObjectId(userId),
    trip: itemObjId,
  });

  if (booking) {
    const trip = await Trip.findById(booking.trip).select('title images price');
    details = {
      _id: booking._id,
      title: trip?.title,
      images: trip?.images,
      price: trip?.price,
     
      
    };
  }

} else if (item.type === 'course') {
  const bookingClass = await BookingClass.findOne({
    userId: new Types.ObjectId(userId),
    _id: itemObjId,
  });

  if (bookingClass) {
    const course = await Class.findById(bookingClass.classId).select('title image price');
    details = {
      _id: bookingClass._id,
      title: course?.title,
      images: course?.image,
      price: course?.price,
      
    };
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
