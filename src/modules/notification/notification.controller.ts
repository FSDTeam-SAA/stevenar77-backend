import { Request, Response } from 'express'
import { Notification } from './notification.model'
import catchAsync from '../../utils/catchAsync'
import httpStatus from 'http-status'

/*********************************
 * GET ALL NOTIFICATIONS BY USER *
 *********************************/
export const getUserNotifications = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.params

    const notifications = await Notification.find({ to: userId }).sort({
      createdAt: -1,
    })

    const unreadCount = await Notification.countDocuments({ isViewed: false })

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Notifications fetched successfully',
      data: { notifications, unreadCount },
    })
  }
)

/**********************************
 * MARK ALL NOTIFICATIONS AS READ *
 **********************************/
export const markAllAsRead = catchAsync(async (req: Request, res: Response) => {

  const result = await Notification.updateMany(
    { isViewed: false },
    { isViewed: true }
  )

  res.status(httpStatus.OK).json({
    success: true,
    message: 'All notifications marked as read',
    modifiedCount: result.modifiedCount,
  })
})

/**
 import { createNotification } from '../services/notification.service'
import AppError from '../../errors/AppError';

await createNotification({
  to: user._id,
  message: 'You have a new message',
  type: 'message',
  id: message._id,
})

 */

/*********************************
 * GET ALL NOTIFICATIONS (ADMIN) *
 *********************************/
export const getAllNotifications = catchAsync(
  async (req: Request, res: Response) => {
    const notifications = await Notification.find()
      .populate('to', 'name email') // optional: show user info
      .sort({ createdAt: -1 }) // newest first
      .lean()

    res.status(httpStatus.OK).json({
      success: true,
      message: 'All notifications fetched successfully',
      data: notifications,
    })
  }
)
