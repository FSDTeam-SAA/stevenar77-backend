import { Request, Response } from 'express'
import httpStatus from 'http-status'
import catchAsync from '../../utils/catchAsync'
import AppError from '../../errors/AppError'
import sendResponse from '../../utils/sendResponse'
import { BookingClass } from './bookingClass.model'

/*****************
 * CREATE BOOKING
 *****************/
export const createBooking = catchAsync(async (req, res) => {
  const { classId, participant, classDate } = req.body

  if (!classId || !participant || !classDate) {
    throw new AppError('Missing required fields', httpStatus.BAD_REQUEST)
  }

  const booking = await BookingClass.create({
    classId,
    userId: req.user._id, // logged-in user
    participant,
    classDate,
  })

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Booking created successfully',
    data: booking,
  })
})

/*****************
 * DELETE BOOKING
 *****************/
export const deleteBooking = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params

  const booking = await BookingClass.findByIdAndDelete(id)
  if (!booking) throw new AppError('Booking not found', httpStatus.NOT_FOUND)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Booking deleted successfully',
    data: booking,
  })
})

/*****************
 * GET ALL BOOKINGS FOR USER
 *****************/
export const getUserBookings = catchAsync(async (req, res) => {
  const bookings = await BookingClass.find({ userId: req.user._id })
    .populate('classId')
    .populate('userId', 'name email')

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User bookings fetched successfully',
    data: bookings,
  })
})

/*****************
 * GET SINGLE BOOKING
 *****************/
export const getSingleBooking = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params

    const booking = await BookingClass.findById(id)
      .populate('classId')
      .populate('userId', 'name email')

    if (!booking) throw new AppError('Booking not found', httpStatus.NOT_FOUND)

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Booking fetched successfully',
      data: booking,
    })
  }
)

/*****************
 * CHANGE STATUS
 *****************/
export const changeBookingStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params
    const { status } = req.body

    if (!['pending', 'completed', 'canceled'].includes(status)) {
      throw new AppError('Invalid status value', httpStatus.BAD_REQUEST)
    }

    const booking = await BookingClass.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    )

    if (!booking) throw new AppError('Booking not found', httpStatus.NOT_FOUND)

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Booking status updated successfully',
      data: booking,
    })
  }
)
