import cron from 'node-cron'
import Stripe from 'stripe'
import { PaymentRecord } from '../modules/cart/paymentRecords.model'
import { Cart } from '../modules/cart/cart.model'
import Booking from '../modules/trips/booking/booking.model'
import Order from '../modules/order/order.model'
import { sendTemplateEmail } from '../utils/sendTemplateEmail'
import { BookingClass } from '../modules/bookingClass/bookingClass.model'
import { User } from '../modules/user/user.model'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
})

cron.schedule('*/1 * * * *', async () => {
  console.log('🔁 Checking PaymentRecord pending payments...')

  try {
    const pendingPayments = await PaymentRecord.find({
      paymentStatus: 'pending',
      paymentIntent: { $exists: true },
    })

    for (const payment of pendingPayments) {
      try {
        // Retrieve Stripe payment intent
        const pi = await stripe.paymentIntents.retrieve(
          payment.paymentIntent as string
        )

        if (pi.status === 'succeeded') {
          console.log(`💰 Payment success for: ${payment._id}`)

          // Update PaymentRecord
          payment.paymentStatus = 'successful'
          await payment.save()

          // Fetch carts from payment.cartsIds
          const carts = await Cart.find({ _id: { $in: payment.cartsIds } })

          for (const cart of carts) {
            cart.status = 'complete'
            await cart.save()

            // Now update the related booking/order/class based on cart.type
            if (cart.type === 'course') {
              await BookingClass.findByIdAndUpdate(cart.itemId, {
                status: 'paid',
              })

              const user = await payment.populate('userId', 'email')
              if (user.userId?._id) {
                const userWithEmail = await User.findById(user.userId._id)
                if (userWithEmail?.email) {
                  void sendTemplateEmail(userWithEmail.email, 'courses', {
                    orderId: String(payment._id),
                  })
                }
              }
            }

            if (cart.type === 'product') {
              await Order.findByIdAndUpdate(cart.itemId, { status: 'paid' })

              const order = await Order.findById(cart.itemId)
                .populate('userId', 'email')
                .lean()

              if (order?.userId?._id) {
                const user = await User.findById(order.userId._id)
                if (user?.email) {
                  void sendTemplateEmail(user.email, 'product', {
                    orderId: String(order._id),
                  })
                }
              }
            }

            if (cart.type === 'trip') {
              await Booking.findByIdAndUpdate(cart.itemId, { status: 'paid' })

              const booking = await Booking.findById(cart.itemId).populate(
                'user',
                'email'
              )
              if (booking?.user?._id) {
                const user = await User.findById(booking.user._id)
                if (user?.email) {
                  void sendTemplateEmail(user.email, 'trips', {
                    orderId: String(booking._id),
                  })
                }
              }
            }
          }
        }

        if (pi.status === 'canceled') {
          console.log(`❌ Payment canceled: ${payment._id}`)

          payment.paymentStatus = 'cancelled'
          await payment.save()
        }
      } catch (err: any) {
        console.error(
          `⚠️ Error processing PaymentRecord ${payment._id}:`,
          err.message
        )
      }
    }

    console.log('✅ PaymentRecord cron job finished.')
  } catch (error) {
    console.error('❗ Cron Job Error:', (error as Error).message)
  }
})
