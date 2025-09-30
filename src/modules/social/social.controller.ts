import { Request, Response } from 'express'
import Social from './social.model'
import catchAsync from '../../utils/catchAsync'
import sendResponse from '../../utils/sendResponse'
import AppError from '../../errors/AppError'
import { StatusCodes } from 'http-status-codes'

// Create Social Profile
export const createSocialProfile = catchAsync(
  async (req: Request, res: Response) => {
    const { facebook, instagram, location, email, phoneNumber } = req.body

    // Check if the email already exists
    const existingProfile = await Social.findOne({ email })
    if (existingProfile) {
      throw new AppError(
        'Profile with this email already exists',
        StatusCodes.BAD_REQUEST
      )
    }

    const socialProfile = await Social.create({
      facebook,
      instagram,
      location,
      email,
      phoneNumber,
    })

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: 'Social profile created successfully',
      data: socialProfile,
    })
  }
)

// Get All Social Profiles
export const getAllSocialProfiles = catchAsync(
  async (req: Request, res: Response) => {
    const profiles = await Social.find()

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Social profiles fetched successfully',
      data: profiles,
    })
  }
)

// Get Social Profile by ID
export const getSocialProfileById = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params

    const profile = await Social.findById(id)
    if (!profile) {
      throw new AppError('Profile not found', StatusCodes.NOT_FOUND)
    }

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Social profile fetched successfully',
      data: profile,
    })
  }
)

// Update Social Profile
export const updateSocialProfile = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params
    const { facebook, instagram, location, email, phoneNumber } = req.body

    const updatedProfile = await Social.findByIdAndUpdate(
      id,
      {
        facebook,
        instagram,
        location,
        email,
        phoneNumber,
      },
      { new: true }
    )

    if (!updatedProfile) {
      throw new AppError('Profile not found', StatusCodes.NOT_FOUND)
    }

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Social profile updated successfully',
      data: updatedProfile,
    })
  }
)

// Delete Social Profile
export const deleteSocialProfile = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params

    const deletedProfile = await Social.findByIdAndDelete(id)
    if (!deletedProfile) {
      throw new AppError('Profile not found', StatusCodes.NOT_FOUND)
    }

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Social profile deleted successfully',
    })
  }
)
