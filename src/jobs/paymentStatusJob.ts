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
import sendAdminPaymentNotification from '../utils/sendAdminPaymentNotification'
import sendEmail from '../utils/sendEmail'

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
          payment.paymentSeasonId as string,
        )

        // Extract payment intent ID
        const paymentIntentId = session.payment_intent as string

        if (!paymentIntentId) {
          console.log(
            `⚠️ No payment_intent found for PaymentRecord ${payment._id}`,
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

          // Collect admin notification data for ONE consolidated email
          const adminItems: Array<{
            type: 'course' | 'product' | 'trip'
            title: string
            quantity?: number
            price: number
          }> = []
          let userEmail: string | null = null
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
                  userEmail = userWithEmail.email

                  // Get class details to get title
                  const classBooking = await BookingClass.findById(
                    cart.bookingId,
                  ).populate('classId')

                  const classData = await Class.findById(classBooking?.classId)
                  const classTitle = classData?.title || 'Unknown Course'

                  // Add to admin items
                  adminItems.push({
                    type: 'course',
                    title: classTitle,
                    quantity: 1,
                    price: cart.price,
                  })

                  // Send user notification for course purchase
                  void sendTemplateEmail(
                    userWithEmail.email,
                    'courses',
                    classTitle,
                    { orderId: String(payment._id) },
                  )
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
                  if (!userEmail) {
                    userEmail = user.email
                  }
                  if (!productUserEmail) {
                    productUserEmail = user.email
                  }

                  // Get product details to get title
                  const product = await Product.findById(order.productId)
                  const productTitle = product?.title || 'Product'

                  console.log('productTitle from cron', productTitle)

                  // Add to admin items
                  adminItems.push({
                    type: 'product',
                    title: productTitle,
                    quantity: order.quantity || 1,
                    price: cart.price,
                  })

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
                        { new: true },
                      )

                      // Check if all variants are out of stock
                      if (updatedProduct && updatedProduct.variants) {
                        const allVariantsOutOfStock =
                          updatedProduct.variants.every(
                            (variant: any) => variant.quantity <= 0,
                          )
                        if (allVariantsOutOfStock) {
                          await Product.findByIdAndUpdate(order.productId, {
                            inStock: false,
                          })
                        }
                      }

                      console.log(
                        `✅ Reduced variant quantity for product ${order.productId}`,
                      )
                    }
                  } else {
                    // Reduce productQuantity for non-variant products
                    const updatedProduct = await Product.findByIdAndUpdate(
                      order.productId,
                      {
                        $inc: { productQuantity: -(order.quantity || 1) },
                      },
                      { new: true },
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
                      `✅ Reduced productQuantity for product ${order.productId}`,
                    )
                  }
                }
              }
            }

            if (cart.type === 'trip') {
              await Booking.findByIdAndUpdate(cart.itemId, { status: 'paid' })

              const booking = await Booking.findById(cart.bookingId)
                .populate('user', 'email')
                .populate('trip')

              console.log('booking trip from payment status job__', booking)

              if (!booking) {
                console.log(`⚠️ Booking not found for cart ${cart._id}`)
                continue
              }

              // Get trip details to get title
              const tripTitle = (booking.trip as any)?.title || 'Trip'

              // Send email to the booking user
              if (booking?.user?._id) {
                const user = await User.findById(booking.user._id)
                if (user?.email) {
                  if (!userEmail) {
                    userEmail = user.email
                  }

                  console.log('tripTitle form cron', tripTitle)

                  // Add to admin items
                  adminItems.push({
                    type: 'trip',
                    title: tripTitle,
                    quantity: booking.participants?.length || 1,
                    price: cart.price,
                  })

                  void sendTemplateEmail(user.email, 'trips', tripTitle, {
                    orderId: String(booking._id),
                  })
                }
              }

              // Send email to all participants
              if (booking?.participants && booking.participants.length > 0) {
                for (const participant of booking.participants) {
                  if (participant.email) {
                    console.log(
                      `📧 Sending trip email to participant: ${participant.email}`,
                    )

                    void sendTemplateEmail(
                      participant.email,
                      'trips',
                      tripTitle,
                      { orderId: String(booking._id) },
                    )
                  }
                }
              }
            }
          }

          // Send ONE consolidated admin email with all purchase details
          const adminEmail = process.env.ADMIN_EMAIL
          if (adminEmail && adminItems.length > 0 && userEmail) {
            const htmlContent = sendAdminPaymentNotification({
              userEmail,
              totalAmount: String(payment.totalPrice || '0'),
              items: adminItems,
              paymentId: String(payment._id),
              paymentDate: new Date(payment.createdAt || new Date()).toLocaleDateString(
                'en-US',
                {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                },
              ),
            })

            console.log(
              `📧 Sending consolidated admin payment notification to ${adminEmail}`,
            )
            void sendEmail({
              to: adminEmail,
              subject: `New Payment Received - ${payment._id}`,
              html: htmlContent,
            })
          }

          // After processing all carts, send ONE consolidated email for all products
          if (productUserEmail && processedProductOrderIds.length > 0) {
            console.log(
              `📧 Sending consolidated product email to ${productUserEmail} for ${processedProductOrderIds.length} product order(s)`,
            )
            void sendTemplateEmail(productUserEmail, 'product', 'Product', {
              orderId: processedProductOrderIds.join(', '),
            })
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
          err.message,
        )
      }
    }

    console.log('✅ PaymentRecord cron job finished.')
  } catch (error) {
    console.error('❗ Cron Job Error:', (error as Error).message)
  }
})
