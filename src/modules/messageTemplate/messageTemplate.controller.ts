import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../utils/catchAsync'
import sendResponse from '../../utils/sendResponse'
import { messageTemplateService } from './messageTemplate.service'

const createTemplate = catchAsync(async (req, res) => {
  const result = await messageTemplateService.createTemplate(req.body)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Template created successfully',
    data: result,
  })
})

const getAllTemplates = catchAsync(async (req, res) => {
  const result = await messageTemplateService.getAllTemplates()
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Templates fetched successfully',
    data: result,
  })
})

const getSingleTemplate = catchAsync(async (req, res) => {
  const { id } = req.params
  const result = await messageTemplateService.getSingleTemplate(id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Template fetched successfully',
    data: result,
  })
})

const updateTemplate = catchAsync(async (req, res) => {
  const { id } = req.params
  const result = await messageTemplateService.updateTemplate(id, req.body)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Template updated successfully',
    data: result,
  })
})

const deleteTemplate = catchAsync(async (req, res) => {
  const { id } = req.params
  await messageTemplateService.deleteTemplate(id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Template deleted successfully',
  })
})

const updateStatus = catchAsync(async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  const result = await messageTemplateService.updateStatus(id, status)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Template status updated to ${status}`,
    data: result,
  })
})

export const messageTemplateController = {
  createTemplate,
  getAllTemplates,
  getSingleTemplate,
  updateTemplate,
  deleteTemplate,
  updateStatus,
}
