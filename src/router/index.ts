import { Router } from 'express'
import aboutRouter from '../modules/about/about.route'
import authRouter from '../modules/auth/auth.router'
import classBookingRouter from '../modules/bookingClass/bookingClass.routes'
import classRouter from '../modules/class/class.router'
import contactRouter from '../modules/contact/contact.router'
import conversationRoutes from '../modules/conversation/conversation.routes'
import dashboardRouter from '../modules/dashboard/dashboard.router'
import messageRoutes from '../modules/message/message.routes'
import notificationRouter from '../modules/notification/notification.route'
import orderRouter from '../modules/order/order.router'
import shopRouter from '../modules/product/product.router'
import reviewsRouter from '../modules/reviewRating/reviewRating.routes'
import productRouter from '../modules/Shop/shop.routes'
import socialRouter from '../modules/social/social.routes'
import TripRoutes from '../modules/trips/trip.routes'
import userRouter from '../modules/user/user.router'
import { messageTemplateRouter } from '../modules/messageTemplate/messageTemplate.route'
import cartRouter from '../modules/cart/cart.route'
const router = Router()

const moduleRoutes = [
  {
    path: '/user',
    route: userRouter,
  },
  {
    path: '/auth',
    route: authRouter,
  },
  {
    path: '/class',
    route: classRouter,
  },
  {
    path: '/class/bookings',
    route: classBookingRouter,
  },
  {
    path: '/product',
    route: productRouter,
  },
  {
    path: '/contact',
    route: contactRouter,
  },
  {
    path: '/order',
    route: orderRouter,
  },
  {
    path: '/trip',
    route: TripRoutes,
  },
  {
    path: '/reviews',
    route: reviewsRouter,
  },
  {
    path: '/conversation',
    route: conversationRoutes,
  },
  {
    path: '/message',
    route: messageRoutes,
  },
  {
    path: '/dashboard',
    route: dashboardRouter,
  },
  {
    path: '/notifications',
    route: notificationRouter,
  },
  {
    path: '/shop',
    route: shopRouter,
  },
  {
    path: '/about',
    route: aboutRouter,
  },
  {
    path: '/social',
    route: socialRouter,
  },
  {
    path: '/message-template',
    route: messageTemplateRouter,
  },
  {
    path: '/cart',
    route: cartRouter,
  },
]

moduleRoutes.forEach((route) => router.use(route.path, route.route))

export default router
