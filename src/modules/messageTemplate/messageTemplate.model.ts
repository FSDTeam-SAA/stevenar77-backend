import { Schema, model } from 'mongoose'
import {
  IMessageTemplate,
  MessageTemplateModel,
} from './messageTemplate.interface'

const messageTemplateSchema = new Schema<IMessageTemplate>(
  {
    tempName: { type: String, required: true },
    emailSubject: { type: String, required: true },
    type: {
      type: String,
      enum: ['trips', 'product', 'courses'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'deactivate'],
      default: 'deactivate',
    },
    messageBody: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
)

export const MessageTemplate = model<IMessageTemplate, MessageTemplateModel>(
  'MessageTemplate',
  messageTemplateSchema
)
