import Stripe from 'stripe'
import Trip from '../trip.model'
import Booking from './booking.model'
import mongoose, { ObjectId } from 'mongoose'
import { User } from '../../user/user.model'
import { createNotification } from '../../../socket/notification.service'
import cartService from '../../cart/cart.service'
import { ICart } from '../../cart/cart.interface'

export class TripBookingService {
  static async createCheckoutSession(
    tripId: string,
    userId: string,
    participants: {
      firstName: string
      lastName: string
      email: string
      mobile: number
    }[],
    totalParticipants: number
  ): Promise<{ sessionUrl: string; tripBookingId: string }> {
    // 1. Check if trip exists
    const trip = await Trip.findById(tripId)
    if (!trip) throw new Error('Trip not found')

    //  Get user
    const user = await User.findById(userId)

    //  Check capacity
    if (trip.maximumCapacity < participants.length)
      throw new Error('Not enough spots available')

    // Calculate total price
    const totalPrice = Number(trip.price) * totalParticipants

    // Create booking with 'pending' status
    const booking = await Booking.create({
      trip: trip._id,
      user: userId,
      participants,
      totalPrice,
      totalParticipants,
      status: 'pending',
    })

    const payload = {
      userId,
      itemId: booking._id,
      type: 'trip',
      price: totalPrice,
    }
    const cart = await cartService.createCartItem({
      ...payload,
      userId: new mongoose.Types.ObjectId(payload.userId),
    } as ICart)

    /*************************************
     * 🔔 Notify the admin about booking *
     *************************************/
    const admin = await User.findOne({ role: 'admin' }).select('_id')
    if (admin) {
      await createNotification({
        to: new mongoose.Types.ObjectId(admin._id),
        message: `New trip booking request for trip "${
          trip.title || tripId
        }" by user ${user?.firstName || userId} email:${user?.email || userId}`,
        type: 'tripBooking',
        id: trip._id,
      })
    }

    return {
      tripBookingId: booking._id,
      cart,
    }
  }
}
