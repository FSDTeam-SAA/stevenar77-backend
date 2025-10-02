import { Request, Response, NextFunction } from 'express'
import { Class } from './class.model'
import catchAsync from '../../utils/catchAsync'
import sendResponse from '../../utils/sendResponse'
import AppError from '../../errors/AppError'
import { IClass } from './class.interface'
import { deleteFromCloudinary, uploadToCloudinary } from '../../utils/cloudinary'
import { StatusCodes } from 'http-status-codes'

export const createClass = catchAsync(async (req, res) => {
  const file = req.file as Express.Multer.File
  const { index, duration, ...rest } = req.body

  if (!file) {
    throw new AppError('Image is required', StatusCodes.BAD_REQUEST)
  }

  // Upload to Cloudinary
  const uploadResult = await uploadToCloudinary(file.path, 'classes')

  // ----- Handle index logic -----
  let insertIndex: number

  if (index !== undefined) {
    const newIndex = Number(index)

    // Shift classes >= newIndex
    await Class.updateMany(
      { index: { $gte: newIndex } },
      { $inc: { index: 1 } }
    )

    insertIndex = newIndex
  } else {
    // If no index provided, append at the end
    const maxIndexClass = await Class.findOne().sort({ index: -1 })
    insertIndex = maxIndexClass ? (maxIndexClass.index ?? 0) + 1 : 1
  }

  // ----- Create new class -----
  const result = await Class.create({
    ...rest,
    duration,
    index: insertIndex,
    image: {
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url,
    },
  })

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Class created successfully',
    data: result,
  })
})


export const updateClass = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const files = req.files as {
    image?: Express.Multer.File[]
  }
  const { index, duration, classDates, price, ...rest } = req.body

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

  // ----- Handle classDates parsing -----
  if (classDates !== undefined) {
    try {
      const parsed =
        typeof classDates === 'string' ? JSON.parse(classDates) : classDates

      if (!Array.isArray(parsed)) {
        throw new Error('classDates must be an array')
      }

      updateData.classDates = parsed.map((d: string) => new Date(d))
    } catch (err) {
      throw new AppError(
        'Invalid classDates format. Must be a JSON array of ISO date strings.',
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
