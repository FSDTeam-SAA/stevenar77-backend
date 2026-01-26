import { Request, Response } from 'express'
import catchAsync from '../../utils/catchAsync'
import AppError from '../../errors/AppError'
import httpStatus from 'http-status'
import sendResponse from '../../utils/sendResponse'
import { ReviewRating } from './reviewRating.model'
import { Class } from '../class/class.model'
import Trip from '../trips/trip.model'
import Product from '../product/product.model'
import {
  buildMetaPagination,
  getPaginationParams,
} from '../../utils/pagination'

/*****************
 * CREATE REVIEW
 *****************/

export const createReview = catchAsync(async (req: Request, res: Response) => {
  const { userId, classId, tripId, productId, star, comment, purchaseDate } =
    req.body

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
    purchaseDate,
  })

  // Function to update rating and total reviews
  const updateRating = async (
    model: any,
    id: string,
    ratingField: string,
    reviewsField: string,
  ) => {
    const item = await model.findById(id)
    if (!item) return

    const currentReviews = item[reviewsField] || 0
    const currentRating = item[ratingField] || 0
    const totalReviews = currentReviews + 1
    const avgRating = (currentRating * currentReviews + star) / totalReviews

    await model.findByIdAndUpdate(
      id,
      {
        [reviewsField]: totalReviews,
        [ratingField]: parseFloat(avgRating.toFixed(2)),
      },
      { new: true },
    )
  }

  // Update the corresponding model
  if (classId) {
    await updateRating(Class, classId, 'avgRating', 'totalReviews')
  } else if (tripId) {
    await updateRating(Trip, tripId, 'avgRating', 'totalReviews')
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

  // Function to update rating after deletion
  const updateRatingOnDelete = async (
    model: any,
    itemId: string,
    ratingField: string,
    reviewsField: string,
    deletedStar: number,
  ) => {
    const item = await model.findById(itemId)
    if (!item || item[reviewsField] === 0) return

    const currentReviews = item[reviewsField]
    const currentRating = item[ratingField]
    const newReviews = currentReviews - 1

    let newRating = 0
    if (newReviews > 0) {
      newRating = (currentRating * currentReviews - deletedStar) / newReviews
    }

    await model.findByIdAndUpdate(
      itemId,
      {
        [reviewsField]: newReviews,
        [ratingField]: parseFloat(newRating.toFixed(2)),
      },
      { new: true },
    )
  }

  // Update the corresponding model
  if (deletedReview.classId) {
    await updateRatingOnDelete(
      Class,
      deletedReview.classId.toString(),
      'avgRating',
      'totalReviews',
      deletedReview.star,
    )
  } else if (deletedReview.tripId) {
    await updateRatingOnDelete(
      Trip,
      deletedReview.tripId.toString(),
      'avgRating',
      'totalReviews',
      deletedReview.star,
    )
  } else if (deletedReview.productId) {
    await updateRatingOnDelete(
      Product,
      deletedReview.productId.toString(),
      'averageRating',
      'totalReviews',
      deletedReview.star,
    )
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
      'firstName lastName image',
    )

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Reviews fetched successfully by classId',
      data: reviews,
    })
  },
)

/*****************
 * GET REVIEWS BY TRIP
 *****************/
export const getReviewsByTripId = catchAsync(
  async (req: Request, res: Response) => {
    const { productId } = req.params

    const reviews = await ReviewRating.find({ productId }).populate(
      'userId',
      'firstName lastName image',
    )

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Reviews fetched successfully by productId',
      data: reviews,
    })
  },
)

export const getAllClassReviews = catchAsync(
  async (req: Request, res: Response) => {
    // Parse page, limit, and skip values from query params
    const { page, limit, skip } = getPaginationParams(req.query)

    // Fetch reviews for classes with pagination
    const [reviews, total] = await Promise.all([
      ReviewRating.find({ classId: { $ne: null } })
        .populate('userId', 'firstName lastName image')
        .populate({
          path: 'classId',
          select: 'title image',
        })
        .sort({ createdAt: -1 }) // optional: newest first
        .skip(skip)
        .limit(limit),
      ReviewRating.countDocuments({ classId: { $ne: null } }),
    ])

    // Build pagination metadata
    const meta = buildMetaPagination({ page, limit, total })

    // Send response
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'All class reviews fetched successfully',

      data: { reviews, meta },
    })
  },
)

/*****************
 * RECALCULATE RATINGS (Admin utility to fix data)
 *****************/
export const recalculateAllRatings = catchAsync(
  async (req: Request, res: Response) => {
    // Recalculate Class ratings
    const classes = await Class.find({})
    for (const classItem of classes) {
      const reviews = await ReviewRating.find({ classId: classItem._id })
      const totalReviews = reviews.length
      const avgRating =
        totalReviews > 0
          ? parseFloat(
              (
                reviews.reduce((sum, r) => sum + r.star, 0) / totalReviews
              ).toFixed(2),
            )
          : 0

      await Class.findByIdAndUpdate(
        classItem._id,
        {
          totalReviews,
          avgRating,
        },
        { new: true },
      )
    }

    // Recalculate Trip ratings
    const trips = await Trip.find({})
    for (const trip of trips) {
      const reviews = await ReviewRating.find({ tripId: trip._id })
      const totalReviews = reviews.length
      const avgRating =
        totalReviews > 0
          ? parseFloat(
              (
                reviews.reduce((sum, r) => sum + r.star, 0) / totalReviews
              ).toFixed(2),
            )
          : 0

      await Trip.findByIdAndUpdate(
        trip._id,
        {
          totalReviews,
          avgRating,
        },
        { new: true },
      )
    }

    // Recalculate Product ratings
    const products = await Product.find({})
    for (const product of products) {
      const reviews = await ReviewRating.find({ productId: product._id })
      const totalReviews = reviews.length
      const averageRating =
        totalReviews > 0
          ? parseFloat(
              (
                reviews.reduce((sum, r) => sum + r.star, 0) / totalReviews
              ).toFixed(2),
            )
          : 0

      await Product.findByIdAndUpdate(
        product._id,
        {
          totalReviews,
          averageRating,
        },
        { new: true },
      )
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'All ratings recalculated successfully',
      data: {},
    })
  },
)
