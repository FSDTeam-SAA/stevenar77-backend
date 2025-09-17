import Stripe from 'stripe'
import Trip from '../trip.model'
import Booking from './booking.model'
import mongoose, { ObjectId } from 'mongoose'
import { User } from '../../user/user.model'
import { createNotification } from '../../../socket/notification.service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

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

    // 2. Check capacity
    if (trip.maximumCapacity < participants.length)
      throw new Error('Not enough spots available')

    // 3. Calculate total price
    const totalPrice = Number(trip.price) * participants.length

    // 4. Create booking with 'pending' status
    const booking = await Booking.create({
      trip: trip._id,
      user: userId,
      participants,
      totalPrice,
      totalParticipants,
      status: 'pending',
    })

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

    // 5. Use URLs from environment variables
    const successUrl =
      process.env.frontend_url || 'http://localhost:5000/booking-success'
    const cancelUrl =
      process.env.frontend_url || 'http://localhost:5000/booking-cancel'

    // 6. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: trip.title,
              description: trip.description,
            },
            unit_amount: Math.round((totalPrice / participants.length) * 100), // in cents per participant
          },
          quantity: participants.length,
        },
      ],
      metadata: { tripBookingId: (booking._id as ObjectId).toString() },
      success_url: `${successUrl}?bookingId=${booking._id}`,
      cancel_url: cancelUrl,
    })

    return {
      sessionUrl:
        session.url ?? `https://checkout.stripe.com/pay/${session.id}`,
      tripBookingId: (booking._id as ObjectId).toString(),
    }
  }
}
