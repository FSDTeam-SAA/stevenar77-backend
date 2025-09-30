import { Request, Response, NextFunction } from 'express'
import { Class } from './class.model'
import catchAsync from '../../utils/catchAsync'
import sendResponse from '../../utils/sendResponse'
import AppError from '../../errors/AppError'
import { IClass } from './class.interface'
import { uploadToCloudinary } from '../../utils/cloudinary'
import { StatusCodes } from 'http-status-codes'

export const createClass = catchAsync(async (req, res) => {
  const files = req.files as {
    image?: Express.Multer.File[]
    pdfFiles?: Express.Multer.File[]
  }

  const { duration, pdfFileTypes, price, courseIncludes, classDates, ...rest } =
    req.body

  // Check if image exists
  if (!files.image || files.image.length === 0) {
    throw new AppError('Image is required', StatusCodes.BAD_REQUEST)
  }

  // Upload image to Cloudinary
  const imageUploadResult = await uploadToCloudinary(
    files.image[0].path,
    'classes'
  )

  // Parse pdfFileTypes if provided
  let parsedPdfFileTypes: string[] = []
  if (pdfFileTypes) {
    try {
      parsedPdfFileTypes = JSON.parse(pdfFileTypes)
    } catch (error) {
      throw new AppError('Invalid pdfFileTypes format', StatusCodes.BAD_REQUEST)
    }
  }

  // Upload PDF files to Cloudinary if they exist
  let pdfFilesUploadResults: any[] = []
  if (files.pdfFiles && files.pdfFiles.length > 0) {
    if (parsedPdfFileTypes.length !== files.pdfFiles.length) {
      throw new AppError(
        'Number of PDF files and file types must match',
        StatusCodes.BAD_REQUEST
      )
    }

    pdfFilesUploadResults = await Promise.all(
      files.pdfFiles.map(async (file, index) => {
        const result = await uploadToCloudinary(file.path, 'classes/pdfs')
        return {
          fileType: parsedPdfFileTypes[index],
          public_id: result.public_id,
          url: result.secure_url,
        }
      })
    )
  }

  // ✅ Parse JSON-string fields safely
  let parsedPrice: number[] = []
  let parsedCourseIncludes: string[] = []
  let parsedClassDates: Date[] = []

  try {
    if (price) parsedPrice = JSON.parse(price)
    if (courseIncludes) parsedCourseIncludes = JSON.parse(courseIncludes)
    if (classDates) parsedClassDates = JSON.parse(classDates)
  } catch (error) {
    throw new AppError('Invalid JSON format in fields', StatusCodes.BAD_REQUEST)
  }

  const result = await Class.create({
    ...rest,
    duration,
    price: parsedPrice,
    courseIncludes: parsedCourseIncludes,
    classDates: parsedClassDates,
    image: {
      public_id: imageUploadResult.public_id,
      url: imageUploadResult.secure_url,
    },
    pdfFiles: pdfFilesUploadResults,
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
    pdfFiles?: Express.Multer.File[]
  }
  const { index, duration, pdfFileTypes, classDates, ...rest } = req.body

  const updateData: any = {
    duration,
    ...rest,
  }

  // ----- Handle classDates parsing -----
  if (classDates) {
    try {
      const parsed = JSON.parse(classDates) // must be a JSON string array
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
  if (files.image && files.image.length > 0) {
    const file = files.image[0]
    const uploadResult = await uploadToCloudinary(file.path, 'classes')

    updateData.image = {
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url,
    }

    // Optional: delete old image from Cloudinary
    // const oldClass = await Class.findById(id);
    // if (oldClass?.image?.public_id) {
    //   await deleteFromCloudinary(oldClass.image.public_id);
    // }
  }

  // ----- Handle PDF files upload if provided -----
  if (files.pdfFiles && files.pdfFiles.length > 0) {
    let parsedPdfFileTypes: string[] = []
    if (pdfFileTypes) {
      try {
        parsedPdfFileTypes = JSON.parse(pdfFileTypes)
      } catch (error) {
        throw new AppError(
          'Invalid pdfFileTypes format. Must be a JSON array of strings.',
          StatusCodes.BAD_REQUEST
        )
      }
    }

    if (parsedPdfFileTypes.length !== files.pdfFiles.length) {
      throw new AppError(
        'Number of PDF files and file types must match',
        StatusCodes.BAD_REQUEST
      )
    }

    const pdfFilesUploadResults = await Promise.all(
      files.pdfFiles.map(async (file, index) => {
        const result = await uploadToCloudinary(file.path, 'classes/pdfs')
        return {
          fileType: parsedPdfFileTypes[index],
          public_id: result.public_id,
          url: result.secure_url,
        }
      })
    )

    // Replace all existing PDF files
    updateData.pdfFiles = pdfFilesUploadResults

    // Or append to existing files (uncomment this if you want append instead of replace)
    const existingClass = await Class.findById(id);
    const existingPdfFiles = existingClass?.pdfFiles || [];
    updateData.pdfFiles = [...existingPdfFiles, ...pdfFilesUploadResults];
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
