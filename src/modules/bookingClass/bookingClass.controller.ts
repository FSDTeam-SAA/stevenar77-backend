import { Request, Response } from 'express'
import httpStatus from 'http-status'
import { StatusCodes } from 'http-status-codes'
import mongoose from 'mongoose'
import AppError from '../../errors/AppError'
import catchAsync from '../../utils/catchAsync'
import { uploadToCloudinary } from '../../utils/cloudinary'
import sendEmail from '../../utils/sendEmail'
import sendResponse from '../../utils/sendResponse'
import { IClass } from '../class/class.interface'
import { Class } from '../class/class.model'
import Booking from '../trips/booking/booking.model'
import { User } from '../user/user.model'
import { BookingClass } from './bookingClass.model'
import { sendTemplateEmail } from '../../utils/sendTemplateEmail'
import cartService from '../cart/cart.service'
import { ICart } from '../cart/cart.interface'

export const createBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log('REQ BODY RAW:', req.body)

    // Helper to safely parse JSON-strings
    const fixJSON = (value: any) => {
      try {
        if (
          typeof value === 'string' &&
          (value.startsWith('[') || value.startsWith('{'))
        ) {
          return JSON.parse(value)
        }
        return value
      } catch {
        return value
      }
    }

    // Fix fields
    req.body.classDate = fixJSON(req.body.classDate)
    req.body.addOns = fixJSON(req.body.addOns)
    req.body.medicalDocuments = fixJSON(req.body.medicalDocuments)
    req.body.form = fixJSON(req.body.form)

    // Convert numeric strings → number
    const numericFields = [
      'coursePrice',
      'addOnTotal',
      'totalPrice',
      'age',
      'height',
      'heightInches',
      'weight',
      'shoeSize',
    ]

    numericFields.forEach((field) => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        const cleaned = req.body[field].replace(/[[\]]/g, '')
        req.body[field] = Number(cleaned)
      }
    })

    // Auto-fix schema mismatch
    if (req.body.height && !req.body.hight) {
      req.body.hight = req.body.height
    }

    // gender → lowercase
    if (req.body.gender) {
      req.body.gender = req.body.gender.toLowerCase()
    }

    // participant → number
    if (req.body.participant && typeof req.body.participant === 'string') {
      req.body.participant = Number(req.body.participant)
    }

    // Create booking
    const booking = await BookingClass.create(req.body)

    const payload = {
      userId: booking.userId,
      itemId: booking.classId,
      bookingId: booking._id,
      type: 'course',
      price: booking.totalPrice,
      status: 'pending',
    }

    // save to add to cart
    const cart = await cartService.createCartItem(payload as ICart)

    res.status(201).json({
      success: true,
      message: 'Add to cart class successfull!',
      data: { booking, cart },
    })
  } catch (error: any) {
    console.error('❌ Error creating booking:', error)

    res.status(400).json({
      success: false,
      message: 'Error creating booking',
      error: error.message,
      validation: error?.errors || null,
    })
  }
}

export const updateBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params // Booking ID from URL params

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
    // console.log("existing booking",existingBooking)

    const user = await User.findById(existingBooking.userId)

    // Validate classDate if provided
    if (classDate && (!Array.isArray(classDate) || classDate.length === 0)) {
      res.status(400).json({
        success: false,
        message: 'classDate must be a non-empty array',
      })
      return
    }
    console.log(1)

// Handle medical document uploads if files are provided
let medicalDocuments = existingBooking.medicalDocuments || [];
const files = req.files as Express.Multer.File[];
let names: string[] = [];

console.log(2)

// Parse names array sent from frontend as JSON
if (req.body.medicalDocumentsNames) {
  try {
    names = JSON.parse(req.body.medicalDocumentsNames);
  } catch (err) {
    console.error("Invalid JSON for medicalDocumentsNames", err);
  }
}

// If files exist, upload to Cloudinary and attach names
if (files && files.length > 0) {
  const uploadResults = await Promise.all(
    files.map((file) => uploadToCloudinary(file.path, "medical_documents"))
  );

  medicalDocuments = uploadResults.map((uploaded, idx) => ({
    name: names[idx] || "Unknown",
    public_id: uploaded.public_id,
    url: uploaded.secure_url,
  }));
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

      console.log(3)

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
    console.log(2)

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      data: updatedBooking,
    })

    sendTemplateEmail(user?.email ?? '', 'courses')
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
    //console.log('hitting this API ', id)

    const booking = await BookingClass.findById(id)
      .populate('classId')
      .populate('userId', 'name email')

    if (!booking) throw new AppError('Booking not found', httpStatus.NOT_FOUND)

    // ✅ Convert to unknown first, then to your interface type
    const classData = booking.classId as unknown as mongoose.Document & IClass

    const scheduleData = classData.schedule?.find(
      (s: any) => s._id.toString() === booking.scheduleId?.toString()
    )

    const responseData = {
      ...booking.toObject(),
      scheduleData: scheduleData || null,
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Booking fetched successfully',
      data: responseData,
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

    // const user = await User.findById(userId)

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

    // await sendTemplateEmail(user?.email ?? '', 'courses')

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

  // Step 4: Start transaction
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    // Update booking schedule
    const updatedBooking = await BookingClass.findByIdAndUpdate(
      bookingId,
      { scheduleId: newScheduleId },
      { new: true, runValidators: true, session }
    )

    // Find schedules (if available)
    const oldSchedule = classData.schedule?.find(
      (s) => s._id?.toString() === oldScheduleId
    )
    const newSchedule = classData.schedule?.find(
      (s) => s._id?.toString() === newSchedObjId
    )

    // Update counts only if schedules exist
    if (oldSchedule) {
      oldSchedule.participents = Math.max(0, oldSchedule.participents! + 1)
      oldSchedule.totalParticipents = Math.max(
        0,
        oldSchedule.totalParticipents! - 1
      )
    }

    if (newSchedule) {
      newSchedule.participents = Math.max(0, newSchedule.participents! - 1)
      newSchedule.totalParticipents = newSchedule.totalParticipents! + 1
    }

    // Save class changes
    await classData.save({ session })

    await session.commitTransaction()
    session.endSession()

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Booking re-assigned successfully',
      data: updatedBooking,
    })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    throw error
  }
})

export const deleteAllBookingClass = catchAsync(async (req, res) => {
  const { bookingIds } = req.body

  let deletedBookings
  let session

  try {
    session = await mongoose.startSession()
    session.startTransaction()

    if (bookingIds) {
      const idsArray = Array.isArray(bookingIds)
        ? bookingIds
        : (bookingIds as string).split(',')

      const validObjectIds = []
      for (const id of idsArray) {
        if (mongoose.Types.ObjectId.isValid(id as string)) {
          validObjectIds.push(new mongoose.Types.ObjectId(id as string))
        } else {
          throw new AppError(
            `Invalid booking ID: ${id}`,
            StatusCodes.BAD_REQUEST
          )
        }
      }

      const existingBookings = await BookingClass.find({
        _id: { $in: validObjectIds },
      }).session(session)

      for (const id of validObjectIds) {
        const singleBooking = await BookingClass.findById(id).session(session)

        if (!singleBooking) {
          throw new AppError(`Booking not found`, StatusCodes.NOT_FOUND)
        }
      }

      if (existingBookings.length === 0) {
        await BookingClass.find({}).select('_id').limit(10)
        throw new AppError(`No bookings found`, StatusCodes.NOT_FOUND)
      }

      // Delete the found bookings
      deletedBookings = await BookingClass.deleteMany({
        _id: { $in: validObjectIds },
      }).session(session)
    } else {
      throw new AppError(
        'Please provide bookingIds or set deleteAll=true',
        StatusCodes.BAD_REQUEST
      )
    }

    await session.commitTransaction()

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Selected bookings deleted successfully',
    })
  } catch (error) {
    if (session) {
      await session.abortTransaction()
    }
    throw error
  } finally {
    if (session) {
      session.endSession()
    }
  }
})
