import { Request, Response } from 'express'
import catchAsync from '../../utils/catchAsync'
import sendResponse from '../../utils/sendResponse'
import AppError from '../../errors/AppError'
import { StatusCodes } from 'http-status-codes'
import { About } from './about.model'
import { uploadToCloudinary } from '../../utils/cloudinary'

// ---- Custom type for the expected multer field names ----
type AboutMulterFiles = {
  section1Images?: Express.Multer.File[]
  section2Images?: Express.Multer.File[]
  section3Images?: Express.Multer.File[]
  galleryImages?: Express.Multer.File[]
  teamImages?: Express.Multer.File[]
}

// ---- Utility to upload all images in a section to Cloudinary ----
const processImages = async (
  files?: Express.Multer.File[],
  folder = 'about'
) => {
  if (!files || files.length === 0) return []
  const uploads = await Promise.all(
    files.map((f) => uploadToCloudinary(f.path, folder))
  )
  return uploads.map((u) => ({ public_id: u.public_id, url: u.secure_url }))
}

// ---- Create ----
export const createAbout = catchAsync(async (req: Request, res: Response) => {
  const body = JSON.parse(req.body.data)

  const files = req.files as AboutMulterFiles | undefined

  body.section1.images = await processImages(files?.section1Images)
  body.section2.images = await processImages(files?.section2Images)
  body.section3.images = await processImages(files?.section3Images)
  body.galleryImages = await processImages(files?.galleryImages)

  if (Array.isArray(body.team?.card) && files?.teamImages) {
    const teamUploads = await processImages(files.teamImages)
    body.team.card.forEach((c: any, idx: number) => {
      c.image = teamUploads[idx]
    })
  }

  const result = await About.create(body)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'About created successfully',
    data: result,
  })
})

// ---- Update ----
export const updateAbout = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const body = JSON.parse(req.body.data || '{}')

  const files = req.files as AboutMulterFiles | undefined

  if (files?.section1Images) {
    body.section1 = {
      ...body.section1,
      images: await processImages(files.section1Images),
    }
  }
  if (files?.section2Images) {
    body.section2 = {
      ...body.section2,
      images: await processImages(files.section2Images),
    }
  }
  if (files?.section3Images) {
    body.section3 = {
      ...body.section3,
      images: await processImages(files.section3Images),
    }
  }
  if (files?.galleryImages) {
    body.galleryImages = await processImages(files.galleryImages)
  }

  if (Array.isArray(body.team?.card) && files?.teamImages) {
    const teamUploads = await processImages(files.teamImages)
    body.team.card.forEach((c: any, idx: number) => {
      c.image = teamUploads[idx]
    })
  }

  const updated = await About.findByIdAndUpdate(id, body, { new: true })
  if (!updated) throw new AppError('About entry not found', 404)

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'About updated successfully',
    data: updated,
  })
})

// ---- Get All ----
export const getAllAbout = catchAsync(async (_req: Request, res: Response) => {
  const data = await About.find()
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Fetched',
    data,
  })
})

// ---- Get Single ----
export const getAboutById = catchAsync(async (req: Request, res: Response) => {
  const data = await About.findById(req.params.id)
  if (!data) throw new AppError('Not found', 404)
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Fetched',
    data,
  })
})

// ---- Delete ----
export const deleteAbout = catchAsync(async (req: Request, res: Response) => {
  const deleted = await About.findByIdAndDelete(req.params.id)
  if (!deleted) throw new AppError('Not found', 404)
  sendResponse(res, { statusCode: 200, success: true, message: 'Deleted' })
})
