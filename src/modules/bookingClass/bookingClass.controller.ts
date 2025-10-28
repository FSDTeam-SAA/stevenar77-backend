import { Request, Response } from 'express'
import httpStatus from 'http-status'
import catchAsync from '../../utils/catchAsync'
import AppError from '../../errors/AppError'
import sendResponse from '../../utils/sendResponse'
import { BookingClass } from './bookingClass.model'
import Stripe from 'stripe'
import { Class } from '../class/class.model'
import mongoose from 'mongoose'
import Booking from '../trips/booking/booking.model'
import { uploadToCloudinary } from '../../utils/cloudinary'
import { createNotification } from '../../socket/notification.service'
import { User } from '../user/user.model'
import sendEmail from '../../utils/sendEmail'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
})

export const createBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      classId,
      scheduleId,
      participant,
      classDate,
      price,
      gender,
      shoeSize,
      hight,
      weight,
      Username,
      email,
      phoneNumber,
      emergencyName,
      emergencyPhoneNumber,
      age,
    } = req.body
    const userId = req.user?.id

    // Basic validation
    if (!classId) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields',
      })
      return
    }

    if (!Array.isArray(classDate) || classDate.length === 0) {
      res.status(400).json({
        success: false,
        message: 'classDate must be a non-empty array',
      })
      return
    }

    // Validate Class exists
    const classData = await Class.findById(classId)
    if (!classData) {
      throw new AppError('Class not found', httpStatus.NOT_FOUND)
    }

    if (!classData.isActive) {
      throw new AppError('Class is not available', httpStatus.BAD_REQUEST)
    }

    // ✅ Validate scheduleId exists
    if (!scheduleId) {
      throw new AppError('Schedule ID is required', httpStatus.BAD_REQUEST)
    }
    // ✅ Ensure schedule array exists
    if (!classData.schedule || classData.schedule.length === 0) {
      throw new AppError(
        'No schedules found for this class',
        httpStatus.NOT_FOUND
      )
    }

    // ✅ Find the selected schedule safely
    const selectedSchedule = classData.schedule.find(
      (s: any) => s._id.toString() === scheduleId
    )

    if (!selectedSchedule) {
      throw new AppError(
        'Schedule not found for this class',
        httpStatus.NOT_FOUND
      )
    }

    // ✅ Check available seats (guard against undefined participents)
    const availableSeats = Number(selectedSchedule.participents ?? 0)
    const requestedSeats = Number(participant ?? 1)

    if (availableSeats < requestedSeats) {
      throw new AppError(
        `Only ${availableSeats} seats available in this schedule`,
        httpStatus.BAD_REQUEST
      )
    }

    let medicalDocuments: { public_id: string; url: string }[] = []

    const files = req.files as Express.Multer.File[] // multer.array() gives array of files
    if (files && files.length > 0) {
      const uploadResults = await Promise.all(
        files.map((file) => uploadToCloudinary(file.path, 'medical_documents'))
      )

      medicalDocuments = uploadResults.map((uploaded) => ({
        public_id: uploaded.public_id,
        url: uploaded.secure_url,
      }))
    }

    // Upload medical document if provided

    const totalPrice = price

    //  Create booking
    const booking = await BookingClass.create({
      classId: new mongoose.Types.ObjectId(classId),
      userId: new mongoose.Types.ObjectId(userId),
      participant,
      scheduleId,
      classDate,
      medicalDocuments,
      totalPrice,
      status: 'pending',
      gender,
      shoeSize: Number(shoeSize),
      hight,
      weight: Number(weight),
      Username,
      email,
      phoneNumber,
      emergencyName,
      emergencyPhoneNumber,
      age,
    })

    const bookingCount = participant && participant > 0 ? participant : 1

    await Class.updateOne(
      { _id: classId, 'schedule._id': scheduleId },
      {
        $inc: {
          'schedule.$.participents': -requestedSeats, // decrease available seats
          'schedule.$.totalParticipents': requestedSeats, // increase total booked
        },
      }
    )

    await Class.findByIdAndUpdate(
      classId,
      { $inc: { totalBookings: bookingCount } },
      { new: true }
    )

    // if (classData.schedule.participents === 0) {
    //   await Class.findByIdAndUpdate(classId, { isActive: false });
    // }

    /***********************
     * 🔔 Notify the admin *
     ***********************/
    // Find an admin (if multiple admins, you can broadcast to all)
    const admin = await User.findOne({ role: 'admin' }).select('_id')
    if (admin) {
      await createNotification({
        to: new mongoose.Types.ObjectId(admin._id),
        message: `New booking created for class "${classData.title}" by user ${
          req.user?.firstName || userId
        }, ${req.user?.email}.`,
        type: 'booking',
        id: booking._id,
      })
    }

    // Stripe Checkout

    const successUrl = `https://scuba-life.net/courses/book/forms/${classId}`
    const cancelUrl =
      process.env.FRONTEND_URL || 'https://scuba-life.net/booking-cancel'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: classData.title },
            unit_amount: Math.round(Number(totalPrice) * 100),
          },
          quantity: participant,
        },
      ],
      metadata: { classBookingId: booking._id.toString() },
      success_url: `${successUrl}?bookingId=${booking._id}`,
      cancel_url: cancelUrl,
    })

    if (session.payment_intent) {
      booking.stripePaymentIntentId = session.payment_intent.toString()
      await booking.save()
    }
    console.log('booking', booking)

    res.status(200).json({
      success: true,
      message: 'Checkout session created successfully',
      data: {
        bookingId: booking._id,
        sessionUrl:
          session.url ?? `https://checkout.stripe.com/pay/${session.id}`,
      },
    })
  } catch (error: any) {
    console.error('Error creating booking:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create booking',
    })
  }
}

export const updateBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params // Booking ID from URL params
    // console.log('Update req.body', req.body)

    const {
      participant,
      classDate,
      gender,
      shoeSize,
      hight,
      weight,
      Username,
      email,
      phoneNumber,
      emergencyName,
      emergencyPhoneNumber,
      status,
    } = req.body

    // Validate booking exists
    const existingBooking = await BookingClass.findById(id)
    if (!existingBooking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      })
      return
    }

    // Optional: Check if user owns this booking or is admin
    // const userId = req.user?.id
    // if (
    //   existingBooking.userId.toString() !== userId &&
    //   req.user?.role !== 'admin'
    // ) {
    //   res.status(403).json({
    //     success: false,
    //     message: 'You are not authorized to update this booking',
    //   })
    //   return
    // }

    // Validate classDate if provided
    if (classDate && (!Array.isArray(classDate) || classDate.length === 0)) {
      res.status(400).json({
        success: false,
        message: 'classDate must be a non-empty array',
      })
      return
    }

    // Handle medical document uploads if files are provided
    let medicalDocuments = existingBooking.medicalDocuments
    const files = req.files as Express.Multer.File[]

    if (files && files.length > 0) {
      const uploadResults = await Promise.all(
        files.map((file) => uploadToCloudinary(file.path, 'medical_documents'))
      )

      medicalDocuments = uploadResults.map((uploaded) => ({
        public_id: uploaded.public_id,
        url: uploaded.secure_url,
      }))
    }

    // Prepare update data
    const updateData: any = {
      ...(participant !== undefined && { participant }),
      ...(classDate !== undefined && { classDate }),
      ...(gender !== undefined && { gender }),
      ...(shoeSize !== undefined && { shoeSize: Number(shoeSize) }),
      ...(hight !== undefined && { hight }),
      ...(weight !== undefined && { weight: Number(weight) }),
      ...(Username !== undefined && { Username }),
      ...(email !== undefined && { email }),
      ...(phoneNumber !== undefined && { phoneNumber }),
      ...(emergencyName !== undefined && { emergencyName }),
      ...(emergencyPhoneNumber !== undefined && { emergencyPhoneNumber }),
      ...(status !== undefined && { status }),
      medicalDocuments,
    }

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    // Update booking
    const updatedBooking = await BookingClass.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('classId')
      .populate('userId')

    // Handle participant count changes for class statistics
    if (
      participant !== undefined &&
      participant !== existingBooking.participant
    ) {
      const classId = existingBooking.classId
      const participantDiff = participant - (existingBooking.participant || 0)

      const updatedClass = await Class.findByIdAndUpdate(
        classId,
        { $inc: { totalBookings: participantDiff } },
        { new: true }
      )

      // Check if class needs to be deactivated due to being full
      // if (
      //   updatedClass &&
      //   (updatedClass.totalParticipates ?? 0) > 0 &&
      //   (updatedClass.participates ?? 0) >=
      //     (updatedClass.totalParticipates ?? 0)
      // ) {
      //   await Class.findByIdAndUpdate(classId, { isActive: false })
      // }
    }

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      data: updatedBooking,
    })
  } catch (error: any) {
    console.error('Error updating booking:', error)

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      })
      return
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update booking',
    })
  }
}

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

export const getUserBookings = catchAsync(async (req, res) => {
  const bookings = await BookingClass.find({ userId: req.user.id })
    .populate('classId')
    .populate('userId', 'name email')

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User bookings fetched successfully',
    data: bookings,
  })
})

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

export const getSuccessfulPayments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // const userId = req.user?.id // if you want to filter by current user

    // Query filter: only status "paid"
    const filter = { status: 'paid' }

    // Fetch both in parallel
    const [tripPayments, classPayments] = await Promise.all([
      Booking.find(filter).populate('trip').populate('user').lean(),
      BookingClass.find(filter).populate('classId').populate('userId').lean(),
    ])

    res.status(200).json({
      success: true,
      message: 'Fetched all successful payments',
      data: {
        tripPayments,
        classPayments,
      },
    })
  } catch (error: any) {
    console.error('Error fetching payment history:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch payment history',
    })
  }
}

export const getBookings = catchAsync(async (req, res) => {
  const bookings = await BookingClass.find()
    .populate('classId')
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All bookings fetched successfully',
    data: bookings,
  })
})

// Send mail  by admin to the user with form
export const sendFormLinkToUser = async (req: Request, res: Response) => {
  try {
    const { userId, formLink } = req.body

    if (!userId || !formLink) {
      throw new AppError(
        'userId and formLink are required',
        httpStatus.BAD_REQUEST
      )
    }

    // find user email
    const user = await User.findById(
      new mongoose.Types.ObjectId(userId)
    ).select('email name')
    if (!user) throw new AppError('User not found', httpStatus.NOT_FOUND)

    const emailHtml = `
      <p>Hello ${user.firstName || ''},</p>
      <p>You have been invited to fill out a form for your booking.</p>
      <p>Please click the link below to complete it:</p>
      <a href="${formLink}" target="_blank">${formLink}</a>
      <p>Thanks,<br/>Admin Team</p>
    `

    const result = await sendEmail({
      to: user.email,
      subject: 'Booking Form Link',
      html: emailHtml,
    })

    if (!result.success) {
      throw new AppError(
        result.error || 'Failed to send email',
        httpStatus.INTERNAL_SERVER_ERROR
      )
    }

    res.status(200).json({
      success: true,
      message: `Form link sent to ${user.email}`,
    })
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error sending form link',
    })
  }
}

// update form
export const submitBookingForm = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    // Find the latest pending booking for this user
    const booking = await BookingClass.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 })

    if (!booking) {
      throw new AppError(
        'Booking not found for this user',
        httpStatus.NOT_FOUND
      )
    }

    // Handle uploaded files
    const uploadedFiles: { public_id: string; url: string }[] = []
    const files = req.files as Express.Multer.File[]
    if (files && files.length > 0) {
      for (const file of files) {
        const uploadResult = await uploadToCloudinary(
          file.path,
          'booking_forms'
        )
        if (uploadResult) {
          uploadedFiles.push({
            public_id: uploadResult.public_id,
            url: uploadResult.secure_url,
          })
        }
      }
    }

    // Combine form data
    const formData = {
      ...req.body, // text fields
      documents: uploadedFiles, // uploaded files
    }

    // Update booking
    booking.form = formData
    await booking.save()

    res.status(200).json({
      success: true,
      message: 'Form submitted successfully',
      data: booking,
    })
  } catch (error: any) {
    console.error('Error submitting form:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit form',
    })
  }
}

export const reAssignAnotherSchedule = catchAsync(async (req, res) => {
  const { bookingId } = req.params
  const { newScheduleId } = req.body

  // Step 1: Find booking
  const booking = await BookingClass.findById(bookingId)
  if (!booking) {
    throw new AppError('Booking not found', httpStatus.NOT_FOUND)
  }

  // Step 2: Find class
  const classData = await Class.findById(booking.classId)
  if (!classData) {
    throw new AppError('Class not found', httpStatus.NOT_FOUND)
  }

  const oldScheduleId = booking.scheduleId.toString()
  const newSchedObjId = newScheduleId.toString()

  // Step 3: Prevent re-assigning to same schedule
  if (oldScheduleId === newSchedObjId) {
    throw new AppError(
      'Booking is already assigned to this schedule',
      httpStatus.BAD_REQUEST
    )
  }

  // Step 4: Start transaction for safety
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    // Update booking to new schedule
    const updatedBooking = await BookingClass.findByIdAndUpdate(
      bookingId,
      { scheduleId: newScheduleId },
      { new: true, runValidators: true, session }
    )

    // Find schedules in class
    const oldSchedule = classData.schedule!.find(
      (s) => s._id!.toString() === oldScheduleId
    )
    const newSchedule = classData.schedule!.find(
      (s) => s._id!.toString() === newSchedObjId
    )

    if (!oldSchedule || !newSchedule) {
      throw new AppError(
        'One or both schedules not found',
        httpStatus.NOT_FOUND
      )
    }

    // Apply your logic
    // Old schedule: participents +1, totalParticipents -1
    oldSchedule.participents = Math.max(0, oldSchedule.participents! + 1)
    oldSchedule.totalParticipents = Math.max(
      0,
      oldSchedule.totalParticipents! - 1
    )

    // New schedule: participents -1, totalParticipents +1
    newSchedule.participents = Math.max(0, newSchedule.participents! - 1)
    newSchedule.totalParticipents = newSchedule.totalParticipents! + 1

    // Save class
    await classData.save({ session })

    await session.commitTransaction()
    session.endSession()

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Booking re-assigned to new schedule successfully',
      data: updatedBooking,
    })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    throw error
  }
})
