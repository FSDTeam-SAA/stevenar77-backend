import { NextFunction, Request, Response } from 'express'
import { TripBookingService } from './booking.service'
import Booking from './booking.model'
import mongoose from 'mongoose'
import Trip from '../trip.model'
import { createNotification } from '../../../socket/notification.service'
import { User } from '../../user/user.model'
import AppError from '../../../errors/AppError'
import { StatusCodes } from 'http-status-codes'
import TripBooking from '../booking/booking.model'
export class TripBookingController {
  /**
   * Create a Stripe Checkout session for a trip booking
   */
  static async createCheckoutSession(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { tripId } = req.params
      const { participants, totalParticipants } = req.body
      const userId = req.user?.id

      if (
        !participants ||
        !Array.isArray(participants) ||
        participants.length === 0
      ) {
        res.status(400).json({ message: 'Participants are required' })
        return
      }

      const { sessionUrl, tripBookingId } =
        await TripBookingService.createCheckoutSession(
          tripId,
          userId,
          participants,
          totalParticipants
        )

      res.status(200).json({
        success: true,
        message: 'Checkout session created successfully',
        data: { sessionUrl, tripBookingId },
      })
    } catch (error: any) {
      console.error('Error creating checkout session:', error)
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create checkout session',
      })
    }
  }

  static async getMyPaidBookings(req: Request, res: Response): Promise<void> {
    // //console.log('called')
    try {
      const { userId } = req.params

      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid userId parameter',
        })
        return
      }

      // Parse pagination params with defaults
      const page = parseInt(req.query.page as string, 10) || 1
      const limit = parseInt(req.query.limit as string, 10) || 10
      const skip = (page - 1) * limit

      // Count total documents for this user
      const totalDocs = await Booking.countDocuments({
        user: userId,
        status: 'paid',
      })

      // Query with pagination + sorting + trip population
      const bookings = await Booking.find({
        user: userId,
        status: 'paid',
      })
        .populate('trip')
        .populate('user')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

      //console.log('bookings', bookings)

      res.status(200).json({
        success: true,
        meta: {
          page,
          limit,
          totalItems: totalDocs,
          totalPages: Math.ceil(totalDocs / limit),
        },
        data: bookings,
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch paid bookings',
      })
    }
  }

   static async deleteOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderIds } = req.body

      if (!orderIds) {
        throw new AppError('Order IDs are required', StatusCodes.BAD_REQUEST)
      }

      const idsArray = Array.isArray(orderIds)
        ? orderIds
        : orderIds.split(',')

      const objectIds = idsArray.map(
        (id: string) => new mongoose.Types.ObjectId(id)
      )

      const result = await TripBooking.deleteMany({
        _id: { $in: objectIds },
      })

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Orders deleted successfully',
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }
}

