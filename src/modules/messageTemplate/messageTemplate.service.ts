import AppError from '../../errors/AppError'
import { StatusCodes } from 'http-status-codes'
import { IMessageTemplate } from './messageTemplate.interface'
import { MessageTemplate } from './messageTemplate.model'

const createTemplate = async (payload: IMessageTemplate) => {
  return await MessageTemplate.create(payload)
}

const getAllTemplates = async () => {
  return await MessageTemplate.find().sort({ createdAt: -1 })
}

const getSingleTemplate = async (id: string) => {
  const template = await MessageTemplate.findById(id)
  if (!template) throw new AppError('Template not found', StatusCodes.NOT_FOUND)
  return template
}

const updateTemplate = async (
  id: string,
  payload: Partial<IMessageTemplate>
) => {
  const template = await MessageTemplate.findByIdAndUpdate(id, payload, {
    new: true,
  })
  if (!template) throw new AppError('Template not found', StatusCodes.NOT_FOUND)
  return template
}

const deleteTemplate = async (id: string) => {
  const template = await MessageTemplate.findByIdAndDelete(id)
  if (!template) throw new AppError('Template not found', StatusCodes.NOT_FOUND)
  return template
}

const updateStatus = async (id: string, status: 'active' | 'deactivate') => {
  const template = await MessageTemplate.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  )
  if (!template) throw new AppError('Template not found', StatusCodes.NOT_FOUND)
  return template
}

export const messageTemplateService = {
  createTemplate,
  getAllTemplates,
  getSingleTemplate,
  updateTemplate,
  deleteTemplate,
  updateStatus,
}
