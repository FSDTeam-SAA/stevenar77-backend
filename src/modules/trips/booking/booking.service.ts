import Stripe from 'stripe';
import Trip from '../trip.model';
import Booking from './booking.model';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-08-27.basil' });

export class TripBookingService {
  static async createCheckoutSession(
    tripId: string,
    userId: string,
    participants: { firstName: string; lastName: string; email: string }[]
  ): Promise<{ sessionUrl: string; bookingId: string }> {

    // 1. Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) throw new Error('Trip not found');

    // 2. Check capacity
    if (trip.maximumCapacity < participants.length)
      throw new Error('Not enough spots available');

    // 3. Calculate total price
    const totalPrice = Number(trip.price) * participants.length;

    // 4. Create booking with 'pending' status
    const booking = await Booking.create({
      trip: trip._id,
      user: userId,
      participants,
      totalPrice,
      status: 'pending',
    });

    // 5. Use URLs from environment variables
    const successUrl = process.env.frontend_url || 'http://localhost:5000/booking-success';
    const cancelUrl = process.env.frontend_url || 'http://localhost:5000/booking-cancel';

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
            unit_amount: Math.round(totalPrice / participants.length * 100), // in cents per participant
          },
          quantity: participants.length,
        },
      ],
      metadata: { bookingId: booking._id.toString() },
      success_url: `${successUrl}?bookingId=${booking._id}`,
      cancel_url: cancelUrl,
    });

    return {
      sessionUrl: session.url ?? `https://checkout.stripe.com/pay/${session.id}`,
      bookingId: booking._id.toString(),
    };
  }
}
