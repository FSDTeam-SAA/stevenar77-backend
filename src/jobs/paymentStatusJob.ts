import cron from 'node-cron'
import Stripe from 'stripe'
import { PaymentRecord } from '../modules/cart/paymentRecords.model'
import { Cart } from '../modules/cart/cart.model'
import Booking from '../modules/trips/booking/booking.model'
import Order from '../modules/order/order.model'
import { sendTemplateEmail } from '../utils/sendTemplateEmail'
import { BookingClass } from '../modules/bookingClass/bookingClass.model'
import { User } from '../modules/user/user.model'
import { Class } from '../modules/class/class.model'
import Product from '../modules/product/product.model'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
})

cron.schedule('* * * * *', async () => {
  console.log('🔁 Checking PaymentRecord pending payments...')

  try {
    const pendingPayments = await PaymentRecord.find({
      paymentStatus: 'pending',
      paymentSeasonId: { $exists: true },
    })

    for (const payment of pendingPayments) {
      try {
        // Retrieve Stripe Checkout Session first
        const session = await stripe.checkout.sessions.retrieve(
          payment.paymentSeasonId as string
        )

        // Extract payment intent ID
        const paymentIntentId = session.payment_intent as string

        if (!paymentIntentId) {
          console.log(
            `⚠️ No payment_intent found for PaymentRecord ${payment._id}`
          )
          continue
        }

        // Now retrieve PaymentIntent
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId)

        if (pi.status === 'succeeded') {
          console.log(`💰 Payment success for: ${payment._id}`)

          // Update PaymentRecord
          payment.paymentStatus = 'successful'
          await payment.save()

          // Fetch carts from payment.cartsIds
          const carts = await Cart.find({ _id: { $in: payment.cartsIds } })

          // Track product orders to send single email after processing all carts
          let productUserEmail: string | null = null
          const processedProductOrderIds: string[] = []

          for (const cart of carts) {
            cart.status = 'complete'
            await cart.save()

            console.log('cart data form the message____', cart)

            // Now update the related booking/order/class based on cart.type
            if (cart.type === 'course') {
              await BookingClass.findByIdAndUpdate(cart.itemId, {
                status: 'paid',
              })

              const user = await payment.populate('userId', 'email')

              if (user.userId?._id) {
                const userWithEmail = await User.findById(user.userId._id)
                if (userWithEmail?.email) {
                  // Get class details to get title
                  const classBooking = await BookingClass.findById(
                    cart.bookingId
                  ).populate('classId')

                  console.log(
                    'classbooking form payment staus job___',
                    classBooking
                  )

                  const classData = await Class.findById(classBooking?.classId)
                  const classTitle = classData?.title

                  console.log(
                    'class title from the paymetn staus job',
                    classTitle
                  )

                  // void sendTemplateEmail(
                  //   userWithEmail.email,
                  //   'courses',
                  //   classTitle, // Pass class title for template matching
                  //   { orderId: String(payment._id) }
                  // )
                }
              }
            }

            if (cart.type === 'product') {
              console.log('from payment status job product')
              await Order.findByIdAndUpdate(cart.itemId, { status: 'paid' })

              const order = await Order.findById(cart.itemId)
                .populate('userId', 'email')
                .populate('productId')
                .lean()
              console.log('from payment status job order__', order)

              if (order?.userId?._id) {
                const user = await User.findById(order.userId._id)
                if (user?.email) {
                  // Store user email for sending consolidated email later
                  if (!productUserEmail) {
                    productUserEmail = user.email
                  }

                  // Get product details to get title
                  const product = await Product.findById(order.productId)
                  const productTitle = product?.title || 'Product'

                  console.log('productTitle from cron', productTitle)

                  // Add order ID to the list for consolidated email
                  processedProductOrderIds.push(String(order._id))

                  // Reduce quantity based on product type
                  if (product?.isVariant) {
                    // Reduce variant quantity
                    if (order.color && product) {
                      const updatedProduct = await Product.findOneAndUpdate(
                        { _id: order.productId, 'variants.title': order.color },
                        {
                          $inc: {
                            'variants.$.quantity': -(order.quantity || 1),
                          },
                        },
                        { new: true }
                      )

                      // Check if all variants are out of stock
                      if (updatedProduct && updatedProduct.variants) {
                        const allVariantsOutOfStock =
                          updatedProduct.variants.every(
                            (variant: any) => variant.quantity <= 0
                          )
                        if (allVariantsOutOfStock) {
                          await Product.findByIdAndUpdate(order.productId, {
                            inStock: false,
                          })
                        }
                      }

                      console.log(
                        `✅ Reduced variant quantity for product ${order.productId}`
                      )
                    }
                  } else {
                    // Reduce productQuantity for non-variant products
                    const updatedProduct = await Product.findByIdAndUpdate(
                      order.productId,
                      {
                        $inc: { productQuantity: -(order.quantity || 1) },
                      },
                      { new: true }
                    )

                    // Check if product is out of stock
                    if (
                      updatedProduct &&
                      (updatedProduct.productQuantity || 0) <= 0
                    ) {
                      await Product.findByIdAndUpdate(order.productId, {
                        inStock: false,
                      })
                    }

                    console.log(
                      `✅ Reduced productQuantity for product ${order.productId}`
                    )
                  }

                  // DO NOT send email here - we'll send it after all carts are processed
                }
              }
            }

            if (cart.type === 'trip') {
              await Booking.findByIdAndUpdate(cart.itemId, { status: 'paid' })

              const booking = await Booking.findById(cart.bookingId)
                .populate('user', 'email')
                .populate('trip')

              console.log('booking trip from payment status job__', booking)

              // Get trip details to get title
              const tripTitle = (booking.trip as any)?.title || 'Trip'

              // Send email to the booking user
              if (booking?.user?._id) {
                const user = await User.findById(booking.user._id)
                if (user?.email) {
                  console.log('tripTitle form cron', tripTitle)

                  void sendTemplateEmail(
                    user.email,
                    'trips',
                    tripTitle, // Pass trip title for template matching
                    { orderId: String(booking._id) }
                  )
                }
              }

              // Send email to all participants
              if (booking?.participants && booking.participants.length > 0) {
                for (const participant of booking.participants) {
                  if (participant.email) {
                    console.log(
                      `📧 Sending trip email to participant: ${participant.email}`
                    )

                    void sendTemplateEmail(
                      participant.email,
                      'trips',
                      tripTitle, // Pass trip title for template matching
                      { orderId: String(booking._id) }
                    )
                  }
                }
              }
            }
          }

          // After processing all carts, send ONE consolidated email for all products
          if (productUserEmail && processedProductOrderIds.length > 0) {
            console.log(
              `📧 Sending consolidated product email to ${productUserEmail} for ${processedProductOrderIds.length} product order(s)`
            )
            void sendTemplateEmail(
              productUserEmail,
              'product',
              'Product', // Generic product title for consolidated email
              { orderId: processedProductOrderIds.join(', ') }
            )
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
