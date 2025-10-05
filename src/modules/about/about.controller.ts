import { Request, Response } from 'express'
import catchAsync from '../../utils/catchAsync'
import sendResponse from '../../utils/sendResponse'
import AppError from '../../errors/AppError'
import { StatusCodes } from 'http-status-codes'
import { About, IAbout } from './about.model'
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
  const uploads = await Promise.allSettled(
    files.map((f) => uploadToCloudinary(f.path, folder))
  )

  // Log all rejected promises to see the error messages
  uploads.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(
        `Image upload failed for file at index ${index}:`,
        result.reason
      )
    }
  })

  // Filter for successful uploads
  const successfulUploads = uploads
    .filter((result) => result.status === 'fulfilled')
    .map((result) => (result as PromiseFulfilledResult<any>).value)

  return successfulUploads.map((u) => ({
    public_id: u.public_id,
    url: u.secure_url,
  }))
}

// ---- Create ----
export const createAbout = catchAsync(async (req: Request, res: Response) => {
  const body = JSON.parse(req.body.data)

  const files = req.files as AboutMulterFiles | undefined
  console.log('Gallery files received:', files?.galleryImages?.length)

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

  console.log('Gallery files received:', files?.galleryImages?.length)

  const result = await About.create(body)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'About created successfully',
    data: result,
  })
})

// ---- Update ----
// export const updateAbout = catchAsync(async (req: Request, res: Response) => {
//   const { id } = req.params
//   const body = JSON.parse(req.body.data || '{}')

//   const files = req.files as AboutMulterFiles | undefined

//   if (files?.section1Images) {
//     body.section1 = {
//       ...body.section1,
//       images: await processImages(files.section1Images),
//     }
//   }
//   if (files?.section2Images) {
//     body.section2 = {
//       ...body.section2,
//       images: await processImages(files.section2Images),
//     }
//   }
//   if (files?.section3Images) {
//     body.section3 = {
//       ...body.section3,
//       images: await processImages(files.section3Images),
//     }
//   }
//   if (files?.galleryImages) {
//     body.galleryImages = await processImages(files.galleryImages)
//   }

//   if (Array.isArray(body.team?.card) && files?.teamImages) {
//     const teamUploads = await processImages(files.teamImages)
//     body.team.card.forEach((c: any, idx: number) => {
//       c.image = teamUploads[idx]
//     })
//   }

//   const updated = await About.findByIdAndUpdate(id, body, { new: true })
//   if (!updated) throw new AppError('About entry not found', 404)

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: 'About updated successfully',
//     data: updated,
//   })
// })

export const updateAbout = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const body = JSON.parse(req.body.data || '{}')
  const files = req.files as AboutMulterFiles | undefined

  const existing = (await About.findById(id)) as IAbout | null
  if (!existing) throw new AppError('About entry not found', 404)

  // ---- Section 1 ----
  if (files?.section1Images) {
    body.section1 = {
      ...(existing.section1?.toObject?.() || existing.section1 || {}),
      ...body.section1,
      images: await processImages(files.section1Images),
    }
  } else if (body.section1) {
    // keep old images if none uploaded
    body.section1 = {
      ...(existing.section1?.toObject?.() || existing.section1 || {}),
      ...body.section1,
      images: existing.section1?.images || [],
    }
  }

  // ---- Section 2 ----
  if (files?.section2Images) {
    body.section2 = {
      ...(existing.section2?.toObject?.() || existing.section2 || {}),
      ...body.section2,
      images: await processImages(files.section2Images),
    }
  } else if (body.section2) {
    body.section2 = {
      ...(existing.section2?.toObject?.() || existing.section2 || {}),
      ...body.section2,
      images: existing.section2?.images || [],
    }
  }

  // ---- Section 3 ----
  if (files?.section3Images) {
    body.section3 = {
      ...(existing.section3?.toObject?.() || existing.section3 || {}),
      ...body.section3,
      images: await processImages(files.section3Images),
    }
  } else if (body.section3) {
    body.section3 = {
      ...(existing.section3?.toObject?.() || existing.section3 || {}),
      ...body.section3,
      images: existing.section3?.images || [],
    }
  }

  // ---- Gallery ----
 if (files?.galleryImages) {
  const galleryUploads = await processImages(files.galleryImages)

  // Normalize replaceIndexes from FormData
  let replaceIndexes = body.galleryReplaceIndexes

  // Make sure it’s always an array
  if (!Array.isArray(replaceIndexes)) {
    replaceIndexes = [replaceIndexes]
  }

  // Convert to numbers
  replaceIndexes = replaceIndexes
    .map(i => Number(i))
    .filter(i => !isNaN(i)) // remove invalid values

  // --- Replace or append ---
  if (replaceIndexes.length > 0) {
    const existingGallery = existing.galleryImages || []
    body.galleryImages = [...existingGallery]

    replaceIndexes.forEach((replaceIdx, i) => {
      if (galleryUploads[i] !== undefined) {
        body.galleryImages[replaceIdx] = galleryUploads[i]
      }
    })
  } else {
    // Append new images
    body.galleryImages = [
      ...(existing.galleryImages || []),
      ...galleryUploads,
    ]
  }
} else {
  body.galleryImages = existing.galleryImages || []
}

  // ---- Team ----
  if (Array.isArray(body.team?.card)) {
    if (files?.teamImages) {
      const teamUploads = await processImages(files.teamImages)
      body.team.card.forEach((c: any, idx: number) => {
        if (teamUploads[idx]) {
          c.image = teamUploads[idx]
        } else if (existing.team?.card?.[idx]?.image) {
          // preserve old image
          c.image = existing.team.card[idx].image
        }
      })
    } else {
      // preserve all old team images
      body.team.card.forEach((c: any, idx: number) => {
        if (existing.team?.card?.[idx]?.image) {
          c.image = existing.team.card[idx].image
        }
      })
    }
  }


// ---- Gallery: Keep only selected images ----
if (body.galleryKeepIds && Array.isArray(body.galleryKeepIds)) {
  const existingGallery = existing.galleryImages || []

  // Keep only images whose _id is in galleryKeepIds
  body.galleryImages = existingGallery.filter(
    (img) => body.galleryKeepIds.includes(img.public_id)
  )
} else {
  // If no IDs sent, clear the gallery
  body.galleryImages = []
}


  // ---- Update ----
  const updated = await About.findByIdAndUpdate(
    id,
    { $set: body },
    { new: true, runValidators: true }
  )

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
