import cron from 'node-cron'
import Stripe from 'stripe'
import mongoose from 'mongoose'
import { BookingClass } from '../modules/bookingClass/bookingClass.model'
import order from '../modules/order/order.model'
import Booking from '../modules/trips/booking/booking.model'
import { sendTemplateEmail } from '../utils/sendTemplateEmail'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
})

const checkAndUpdateStatus = async (
  model: mongoose.Model<any>,
  sessionField: string, // stripePaymentIntentId
  emailType: 'trips' | 'product' | 'courses'
) => {
  const pendingPayments = await model.find({
    status: 'pending',
    [sessionField]: { $exists: true },
  })

  for (const item of pendingPayments) {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        item[sessionField],
        {
          expand: ['payment_intent'],
        }
      )

      const paymentIntent = session.payment_intent

      // Type narrowing: only proceed if paymentIntent is an object
      if (paymentIntent && typeof paymentIntent !== 'string') {
        if (paymentIntent.status === 'succeeded') {
          item.status = 'paid'
          item.stripePaymentIntentId = paymentIntent.id
          await item.save()
          console.log(`[${model.modelName}] ✅ Updated ${item._id} to "paid"`)

          // Send email only for TripBooking and Order
          if (
            model.modelName === 'TripBooking' ||
            model.modelName === 'Order'
          ) {
            let recipientEmail = ''

            if (model.modelName === 'TripBooking') {
              const populatedBooking = await item.populate('user', 'email')
              const recipientEmail = populatedBooking.user?.email || ''
              
            } else if (model.modelName === 'Order') {
              const populatedOrder = await item.populate('userId', 'email')
              recipientEmail = populatedOrder.userId?.email || ''
            }

            if (recipientEmail) {
              void sendTemplateEmail(recipientEmail, emailType, {
                orderId: String(item._id),
              })
            }
          }
        } else if (paymentIntent.status === 'canceled') {
          item.status = 'cancelled'
          await item.save()
          console.log(
            `[${model.modelName}] ❌ Updated ${item._id} to "cancelled"`
          )
        }
      }
    } catch (err: any) {
      console.error(
        `[${model.modelName}] ⚠️ Error checking ${item._id}:`,
        err.message
      )
    }
  }
}

// 🕑 Run every 1 minute
cron.schedule('*/1 * * * *', async () => {
  console.log('🔁 Checking pending Stripe payments...')

  await Promise.all([
    checkAndUpdateStatus(BookingClass, 'stripePaymentIntentId', 'courses'), // won't send email
    checkAndUpdateStatus(Booking, 'stripePaymentIntentId', 'trips'),
    checkAndUpdateStatus(order, 'stripePaymentIntentId', 'product'),
  ])

  console.log('✅ Stripe payment status check completed.')
})
