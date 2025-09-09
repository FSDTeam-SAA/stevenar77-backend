import { Request, Response } from 'express'
import catchAsync from '../../utils/catchAsync'
import AppError from '../../errors/AppError'
import httpStatus from 'http-status'
import sendResponse from '../../utils/sendResponse'
import { ReviewRating } from './reviewRating.model'

/*****************
 * CREATE REVIEW
 *****************/
export const createReview = catchAsync(async (req: Request, res: Response) => {
  const { userId, classId, tripId, star, comment } = req.body

  if (!userId || !star) {
    throw new AppError(
      'userId, driverId and star are required',
      httpStatus.BAD_REQUEST
    )
  }

  const review = await ReviewRating.create({
    userId,
    classId,
    tripId,
    star,
    comment,
  })

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Review created successfully',
    data: review,
  })
})

/*****************
 * DELETE REVIEW
 *****************/
export const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params

  const deletedReview = await ReviewRating.findByIdAndDelete(id)

  if (!deletedReview) {
    throw new AppError('Review not found', httpStatus.NOT_FOUND)
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review deleted successfully',
    data: deletedReview,
  })
})

/*****************
 * GET REVIEWS BY DRIVER ID
 *****************/
export const getReviewsByDriverId = catchAsync(
  async (req: Request, res: Response) => {
    const { driverId } = req.params

    const reviews = await ReviewRating.find({ driverId })
      .populate('userId', 'name email') // optionally populate user info
      .sort({ createdAt: -1 })

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Reviews fetched successfully',
      data: reviews,
    })
  }
)
