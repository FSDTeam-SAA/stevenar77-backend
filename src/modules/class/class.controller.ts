import { Request, Response, NextFunction } from 'express'
import { Class } from './class.model'
import catchAsync from '../../utils/catchAsync'
import sendResponse from '../../utils/sendResponse'
import AppError from '../../errors/AppError'
import { IClass } from './class.interface'
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from '../../utils/cloudinary'
import { StatusCodes } from 'http-status-codes'

export const createClass = catchAsync(async (req, res) => {
  const file = req.file as Express.Multer.File
  const {
    index,
    duration,
    addOnce,
    courseIncludes,
    schedule,
    formTitle,
    ...rest
  } = req.body

  // ---- Validate image ----
  if (!file) {
    throw new AppError('Image is required', StatusCodes.BAD_REQUEST)
  }

  // ---- Upload image ----
  const uploadResult = await uploadToCloudinary(file.path, 'classes')

  // ---- Handle index shifting ----
  let insertIndex: number
  if (index !== undefined) {
    const newIndex = Number(index)
    await Class.updateMany(
      { index: { $gte: newIndex } },
      { $inc: { index: 1 } }
    )
    insertIndex = newIndex
  } else {
    const maxIndexClass = await Class.findOne().sort({ index: -1 })
    insertIndex = maxIndexClass ? (maxIndexClass.index ?? 0) + 1 : 1
  }

  // ---- Parse array fields properly ----
  let parsedAddOnce = []
  if (addOnce) {
    try {
      parsedAddOnce =
        typeof addOnce === 'string' ? JSON.parse(addOnce) : addOnce
    } catch (e) {
      throw new AppError('Invalid addOnce format', StatusCodes.BAD_REQUEST)
    }
  }

  let parsedCourseIncludes: string[] = []
  if (courseIncludes) {
    parsedCourseIncludes =
      typeof courseIncludes === 'string'
        ? JSON.parse(courseIncludes)
        : courseIncludes
  }

  let parsedFormTitle: string[] = []
  if (formTitle) {
    parsedFormTitle =
      typeof formTitle === 'string' ? JSON.parse(formTitle) : formTitle
  }

  // ---- Parse schedule properly ----
  let parsedSchedule: any[] = []

  if (schedule) {
    try {
      const sched =
        typeof schedule === 'string' ? JSON.parse(schedule) : schedule
      if (!Array.isArray(sched)) throw new Error()
      parsedSchedule = sched.map((s: any) => {
        if (!Array.isArray(s.sets)) throw new Error()
        return {
          sets: s.sets.map((d: any) => ({
            date: new Date(d.date),
            location: d.location,
            type: d.type,
            isActive: d.isActive ?? true,
          })),
        }
      })
    } catch (e) {
      console.log('Schedule parsing error:', e)
      throw new AppError('Invalid schedule format', StatusCodes.BAD_REQUEST)
    }
  }

  // ---- Create new class ----
  const result = await Class.create({
    ...rest,
    duration,
    index: insertIndex,
    image: {
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url,
    },
    addOnce: parsedAddOnce,
    courseIncludes: parsedCourseIncludes,
    formTitle: parsedFormTitle,
    schedule: parsedSchedule,
  })

  // ---- Send response ----
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Class created successfully',
    data: result,
  })
})


// update class by id
export const updateClass = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const files = req.files as {
    image?: Express.Multer.File[]
  }
  const { index, duration, schedule, price, addOnce, ...rest } = req.body

  const updateData: any = {
    duration,
    ...rest,
  }

  // ----- Handle price parsing -----
  if (price !== undefined) {
    try {
      const parsed = typeof price === 'string' ? JSON.parse(price) : price

      if (!Array.isArray(parsed)) {
        throw new Error('price must be an array of numbers')
      }

      updateData.price = parsed.map((p: any) => Number(p))
    } catch (err) {
      throw new AppError(
        'Invalid price format. Must be a JSON array of numbers.',
        StatusCodes.BAD_REQUEST
      )
    }
  }

  // ----- Handle addOnce parsing -----
  if (addOnce !== undefined) {
    try {
      const parsed = typeof addOnce === 'string' ? JSON.parse(addOnce) : addOnce

      if (!Array.isArray(parsed)) {
        throw new Error('addOnce must be an array of objects')
      }

      updateData.addOnce = parsed.map((item: any) => ({
        title: item.title,
        price: Number(item.price),
      }))
    } catch (err) {
      throw new AppError(
        'Invalid addOnce format. Must be a JSON array of objects with title and price.',
        StatusCodes.BAD_REQUEST
      )
    }
  }

  // ----- Handle schedule parsing -----
  if (schedule !== undefined) {
    try {
      const parsed =
        typeof schedule === 'string' ? JSON.parse(schedule) : schedule

      if (!Array.isArray(parsed)) {
        throw new Error('schedule must be an array')
      }

      // Validate and transform schedule data
      updateData.schedule = parsed.map((scheduleItem: any) => {
        if (!scheduleItem.sets || !Array.isArray(scheduleItem.sets)) {
          throw new Error('Each schedule item must have a sets array')
        }

        return {
          sets: scheduleItem.sets.map((dateItem: any) => ({
            date: new Date(dateItem.date),
            location: dateItem.location || undefined,
            type: dateItem.type, // Should be either 'pool' or 'islands'
            isActive:
              dateItem.isActive !== undefined
                ? Boolean(dateItem.isActive)
                : true,
          })),
        }
      })
    } catch (err) {
      throw new AppError(
        'Invalid schedule format. Must be a JSON array of schedule objects with sets.',
        StatusCodes.BAD_REQUEST
      )
    }
  }

  // ----- Handle image upload if provided -----
  if (files?.image && files.image.length > 0) {
    const file = files.image[0]
    const uploadResult = await uploadToCloudinary(file.path, 'classes')

    // Delete old image from Cloudinary if exists
    const existingClass = await Class.findById(id)
    if (existingClass?.image?.public_id) {
      await deleteFromCloudinary(existingClass.image.public_id)
    }

    updateData.image = {
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url,
    }
  }

  // ----- Handle index logic if provided -----
  if (index !== undefined) {
    const currentClass = await Class.findById(id)
    if (!currentClass) {
      throw new AppError('Class not found', StatusCodes.NOT_FOUND)
    }

    const oldIndex = currentClass.index
    const newIndex = Number(index)

    if (oldIndex !== undefined && oldIndex !== newIndex) {
      if (newIndex < oldIndex) {
        // Moving UP: shift other classes DOWN
        await Class.updateMany(
          { _id: { $ne: id }, index: { $gte: newIndex, $lt: oldIndex } },
          { $inc: { index: 1 } }
        )
      } else {
        // Moving DOWN: shift other classes UP
        await Class.updateMany(
          { _id: { $ne: id }, index: { $gt: oldIndex, $lte: newIndex } },
          { $inc: { index: -1 } }
        )
      }

      updateData.index = newIndex
    }
  }

  // ----- Update the class -----
  const updatedClass = await Class.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  )

  if (!updatedClass) {
    throw new AppError('Class not found', StatusCodes.NOT_FOUND)
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Class updated successfully',
    data: updatedClass,
  })
})

export const getAllClasses = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1
  const limit = req.query.limit ? Number(req.query.limit) : 0
  const skip = limit > 0 ? (page - 1) * limit : 0

  const isAdmin = req.query.isAdmin === 'true' // check query param
  const filter = isAdmin ? {} : { isActive: true }

  const [total, classes] = await Promise.all([
    Class.countDocuments(filter),
    (() => {
      const query = Class.find(filter).sort({ index: 1 }).skip(skip)
      return limit > 0 ? query.limit(limit) : query
    })(),
  ])

  sendResponse<IClass[]>(res, {
    statusCode: 200,
    success: true,
    message: 'Classes fetched successfully',
    data: classes,
    meta: {
      limit: limit || total,
      page: limit > 0 ? page : 1,
      total,
      totalPage: limit > 0 ? Math.ceil(total / limit) : 1,
    },
  })
})

export const deleteClass = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params

    const deletedClass = await Class.findByIdAndDelete(id)
    if (!deletedClass) {
      return next(new AppError('Class not found', 404))
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Class deleted successfully',
    })
  }
)

export const getClassById = catchAsync(async (req, res) => {
  const { id } = req.params
  const isExist = await Class.findById(id)
  if (!isExist) {
    throw new AppError('Class not found', 404)
  }
  const singleClass = await Class.findById(id)

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Class fetched successfully',
    data: singleClass,
  })
})

export const toggleCourseStatus = catchAsync(async (req, res) => {
  const { id } = req.params
  const isExist = await Class.findById(id)
  if (!isExist) {
    throw new AppError('Class not found', 404)
  }

  await Class.findOneAndUpdate(
    { _id: id },
    { $set: { isActive: !isExist.isActive } },
    { new: true }
  )
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Class status updated successfully',
  })
})
