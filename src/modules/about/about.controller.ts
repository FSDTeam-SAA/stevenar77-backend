import { Request, Response } from 'express'
import catchAsync from '../../utils/catchAsync'
import sendResponse from '../../utils/sendResponse'
import AppError from '../../errors/AppError'
import { StatusCodes } from 'http-status-codes'
import { About, IAbout } from './about.model'
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from '../../utils/cloudinary'
import mongoose from 'mongoose'

// ---- Custom type for the expected multer field names ----
type AboutMulterFiles = {
  section1Images?: Express.Multer.File[]
  section2Images?: Express.Multer.File[]
  section3Images?: Express.Multer.File[]
  galleryImages?: Express.Multer.File[]
  teamImages?: Express.Multer.File[]
}

interface IExistingCard {
  // other properties...
  image?: { public_id: string; url: string } | undefined
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
    _id: u._id ?? undefined, // Add _id if present, otherwise undefined
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
  const existingGallery = existing.galleryImages || []

  // 1️⃣ Process new uploads
  let galleryUploads: { public_id: string; url: string }[] = []
  if (files?.galleryImages) {
    galleryUploads = await processImages(files.galleryImages) // should return array of {public_id, url}
  }

  // 2️⃣ Keep all existing images and append new uploads
  const updatedGallery = [...existingGallery, ...galleryUploads]

  // 3️⃣ Optional: Replace specific images by index if provided
  let replaceIndexes = body.galleryReplaceIndexes
  if (!Array.isArray(replaceIndexes))
    replaceIndexes = replaceIndexes ? [replaceIndexes] : []
  replaceIndexes = replaceIndexes
    .map((i: any) => Number(i))
    .filter((i: any) => !isNaN(i))

  replaceIndexes.forEach((replaceIdx: number, i: number) => {
    if (galleryUploads[i] !== undefined) {
      updatedGallery[replaceIdx] = galleryUploads[i]
    }
  })

  // 4️⃣ Set final gallery in body
  body.galleryImages = updatedGallery

  // ---- Team Update Section ----
  // ---- Team Update Section ----
  let teamCardIds: string[] = []

  // 1️⃣ Parse teamCardIds safely
  if (body.teamCardIds) {
    if (typeof body.teamCardIds === 'string') {
      try {
        teamCardIds = JSON.parse(body.teamCardIds)
        if (!Array.isArray(teamCardIds)) teamCardIds = [teamCardIds]
      } catch (err) {
        teamCardIds = [body.teamCardIds]
      }
    } else if (Array.isArray(body.teamCardIds)) {
      teamCardIds = body.teamCardIds
    }
  }

  // 2️⃣ Upload new images (if any)
  let teamUploads: { public_id: string; url: string }[] = []
  if (files?.teamImages) {
    teamUploads = await processImages(files.teamImages)
  }

  // 3️⃣ Build updated cards array - START WITH EXISTING CARDS
  const existingCards = existing.team?.card || []
  let updatedCards = [...existingCards]

  // Track used uploads to avoid reusing the same image
  const usedUploadIndexes = new Set<number>()

  // Process each card update from the request
  // for (const cardUpdate of body.team.card || []) {
  //   // ❌ Remove card if marked for deletion
  //   // if (cardUpdate._delete) {
  //   //   updatedCards = updatedCards.filter(
  //   //     (c) => String(c._id) !== String(cardUpdate._id)
  //   //   )
  //   //   continue
  //   // }

  //   if (cardUpdate._delete || cardUpdate.image === null) {
  //     updatedCards = updatedCards.filter(
  //       (c) => String(c._id) !== String(cardUpdate._id)
  //     )
  //     continue
  //   }

  //   // 🧩 Find existing card index
  //   const existingCardIndex = updatedCards.findIndex(
  //     (c) => c._id && String(c._id) === String(cardUpdate._id)
  //   )

  //   if (existingCardIndex !== -1) {
  //     // 🔄 Update existing card
  //     const existingCard = updatedCards[existingCardIndex]
  //     const matchIndex = teamCardIds.findIndex(
  //       (id) => String(id) === String(cardUpdate._id)
  //     )

  //     // Handle image removal
  //     if (cardUpdate.image === null) {
  //       if (existingCard.image?.public_id) {
  //         await deleteFromCloudinary(existingCard.image.public_id)
  //       }
  //       // Remove image from card
  //       cardUpdate.image = undefined
  //     }

  //     // Update the card
  //     updatedCards[existingCardIndex] = {
  //       ...(existingCard.toObject?.() || existingCard),
  //       ...cardUpdate,
  //       image:
  //         cardUpdate.image === null
  //           ? undefined // image removed
  //           : matchIndex !== -1 && teamUploads[matchIndex]
  //           ? (usedUploadIndexes.add(matchIndex), teamUploads[matchIndex]) // new upload and mark as used
  //           : existingCard.image, // keep old one
  //     }
  //   } else {
  //     // 🆕 New card (add) - FIXED LOGIC
  //     // Find the next available upload that hasn't been used
  //     let availableUploadIndex = -1
  //     for (let i = 0; i < teamUploads.length; i++) {
  //       if (!usedUploadIndexes.has(i)) {
  //         availableUploadIndex = i
  //         usedUploadIndexes.add(i)
  //         break
  //       }
  //     }

  //     const newCard = {
  //       ...cardUpdate,
  //       _id: cardUpdate._id || new mongoose.Types.ObjectId(), // Ensure new card has an ID
  //       image:
  //         availableUploadIndex !== -1
  //           ? teamUploads[availableUploadIndex]
  //           : undefined,
  //     }

  //     updatedCards.push(newCard)
  //   }
  // }

  for (const cardUpdate of body.team.card || []) {
    // ❌ Remove card if marked for deletion
    if (cardUpdate._delete) {
      updatedCards = updatedCards.filter(
        (c) => String(c._id) !== String(cardUpdate._id)
      )
      continue
    }

    // 🧩 Find existing card index
    const existingCardIndex = updatedCards.findIndex(
      (c) => c._id && String(c._id) === String(cardUpdate._id)
    )

    if (existingCardIndex !== -1) {
      // 🔄 Update existing card
      const existingCard = updatedCards[existingCardIndex]
      const matchIndex = teamCardIds.findIndex(
        (id) => String(id) === String(cardUpdate._id)
      )

      // let updatedImage = existingCard.image
      let updatedImage: { public_id: string; url: string } | undefined =
        existingCard.image

      // 🧹 Handle image removal
      if (cardUpdate.image === null) {
        if (existingCard.image?.public_id) {
          await deleteFromCloudinary(existingCard.image.public_id)
        }
        updatedImage = undefined // just remove image, not the card
      }
      // 🆕 Handle new uploaded image
      else if (matchIndex !== -1 && teamUploads[matchIndex]) {
        updatedImage = teamUploads[matchIndex]
        usedUploadIndexes.add(matchIndex)
      }

      updatedCards[existingCardIndex] = {
        ...(existingCard.toObject?.() || existingCard),
        ...cardUpdate,
        image: updatedImage,
      }

      // 🧹 Handle image removal
      if (cardUpdate.image === null) {
        if (existingCard.image?.public_id) {
          await deleteFromCloudinary(existingCard.image.public_id)
        }
        updatedImage = undefined // just remove image, not the card
      }
      // 🆕 Handle new uploaded image
      else if (matchIndex !== -1 && teamUploads[matchIndex]) {
        updatedImage = teamUploads[matchIndex]
        usedUploadIndexes.add(matchIndex)
      }

      updatedCards[existingCardIndex] = {
        ...(existingCard.toObject?.() || existingCard),
        ...cardUpdate,
        image: updatedImage,
      }
    } else {
      // 🆕 New card (add)
      let availableUploadIndex = -1
      for (let i = 0; i < teamUploads.length; i++) {
        if (!usedUploadIndexes.has(i)) {
          availableUploadIndex = i
          usedUploadIndexes.add(i)
          break
        }
      }

      const newCard = {
        ...cardUpdate,
        _id: cardUpdate._id || new mongoose.Types.ObjectId(),
        image:
          availableUploadIndex !== -1
            ? teamUploads[availableUploadIndex]
            : undefined,
      }

      updatedCards.push(newCard)
    }
  }

  // 4️⃣ Assign updated team cards
  body.team = body.team || {}
  body.team.card = updatedCards

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

export const deleteGalleryImage = catchAsync(
  async (req: Request, res: Response) => {
    const { id, imageId } = req.params

    const about = await About.findById(id)
    if (!about) throw new AppError('About entry not found', 404)

    // Find the image object by MongoDB _id
    // Find the image object by its MongoDB _id
    const removedImage = about.galleryImages.find(
      (img: any) => img._id.toString() === imageId
    )

    if (!removedImage) {
      throw new AppError('Gallery image not found', 404)
    }

    // Remove the image from the array
    about.galleryImages = about.galleryImages.filter(
      (img: any) => img._id.toString() !== imageId
    )

    // Remove the file from Cloudinary if it exists
    if (removedImage.public_id) {
      await deleteFromCloudinary(removedImage.public_id)
    }

    // Save the document
    await about.save()

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Gallery image deleted successfully',
      data: about.galleryImages,
    })

    await about.save()

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Gallery image deleted successfully',
      data: about.galleryImages,
    })
  }
)
