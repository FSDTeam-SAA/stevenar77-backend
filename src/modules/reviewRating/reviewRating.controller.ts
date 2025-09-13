import { Request, Response } from 'express'
import catchAsync from '../../utils/catchAsync'
import AppError from '../../errors/AppError'
import httpStatus from 'http-status'
import sendResponse from '../../utils/sendResponse'
import { ReviewRating } from './reviewRating.model'
import { Class } from '../class/class.model'
import Trip from '../trips/trip.model'
import Product from '../product/product.model'

/*****************
 * CREATE REVIEW
 *****************/


export const createReview = catchAsync(async (req: Request, res: Response) => {
  const { userId, classId, tripId, productId, star, comment } = req.body

  if (!userId || !star) {
    throw new AppError('userId and star are required', httpStatus.BAD_REQUEST)
  }

  // Create the review
  const review = await ReviewRating.create({
    userId,
    classId,
    tripId,
    productId,
    star,
    comment,
  })

  // Function to update rating and total reviews
  const updateRating = async (
    model: any,
    id: string,
    ratingField: string,
    reviewsField: string
  ) => {
    const item = await model.findById(id)
    if (!item) return
    const totalReviews = item[reviewsField] + 1
    const avgRating =
      (item[ratingField] * item[reviewsField] + star) / totalReviews

    await model.findByIdAndUpdate(
      id,
      {
        [reviewsField]: totalReviews,
        [ratingField]: avgRating,
      },
      { new: true }
    )
  }

  // Update the corresponding model
  if (classId) {
    await updateRating(Class, classId, 'avgRating', 'totalReviews')
  } else if (tripId) {
    await updateRating(Trip, tripId, 'avgRating', 'maximumCapacity') // For Trip, you can choose a field if needed
  } else if (productId) {
    await updateRating(Product, productId, 'averageRating', 'totalReviews')
  }

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
 * GET REVIEWS BY CLASS
 *****************/
export const getReviewsByClassId = catchAsync(
  async (req: Request, res: Response) => {
    const { classId } = req.params

    const reviews = await ReviewRating.find({ classId }).populate(
      'userId',
      'name avatar'
    )

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Reviews fetched successfully by classId',
      data: reviews,
    })
  }
)

/*****************
 * GET REVIEWS BY TRIP
 *****************/
export const getReviewsByTripId = catchAsync(
  async (req: Request, res: Response) => {
    const { tripId } = req.params

    const reviews = await ReviewRating.find({ tripId }).populate(
      'userId',
      'name avatar'
    )

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Reviews fetched successfully by tripId',
      data: reviews,
    })
  }
)
