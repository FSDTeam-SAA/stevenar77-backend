import cron from 'node-cron'
import Stripe from 'stripe'
import mongoose from 'mongoose'
import { BookingClass } from '../modules/bookingClass/bookingClass.model';
import order from '../modules/order/order.model';
import Booking from '../modules/trips/booking/booking.model';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
})
// Utility to safely check payment and update
const checkAndUpdateStatus = async (
  model: mongoose.Model<any>,
  idField: string
) => {
  const pendingPayments = await model.find({
    status: 'pending',
    [idField]: { $exists: true },
  })

  for (const item of pendingPayments) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(item[idField])

      if (!paymentIntent) continue

      if (paymentIntent.status === 'succeeded') {
        item.status = 'paid'
        await item.save()
      } else if (paymentIntent.status === 'canceled') {
        item.status = 'cancelled'
        await item.save()
      }

      // Optional: log updates
      console.log(
        `[${model.modelName}] Updated ${item._id}: ${paymentIntent.status}`
      )
    } catch (err: any) {
      console.error(
        `[${model.modelName}] Error checking ${item._id}:`,
        err.message
      )
    }
  }
}

// Run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('🔁 Checking pending Stripe payments...')

  await Promise.all([
    checkAndUpdateStatus(BookingClass, 'stripePaymentIntentId'),
    checkAndUpdateStatus(Booking, 'stripePaymentIntentId'),
    // If you have product booking model
    checkAndUpdateStatus(order, 'stripePaymentIntentId'),
  ])

  console.log('✅ Stripe payment status check completed.')
})
