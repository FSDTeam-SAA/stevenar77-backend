import { Router } from "express";
import userRouter from "../modules/user/user.router";
import authRouter from "../modules/auth/auth.router";
import classRouter from "../modules/class/class.router";
import classBookingRouter from "../modules/bookingClass/bookingClass.routes";

const router = Router();

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
]

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
