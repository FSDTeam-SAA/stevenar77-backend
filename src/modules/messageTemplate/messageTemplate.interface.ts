import { Model } from 'mongoose'

export interface IMessageTemplate {
  tempName: string
  emailSubject: string
  type: 'tour' | 'product' | 'courses'
  status: 'active' | 'deactivate'
  messageBody: string
}

export type MessageTemplateModel = Model<IMessageTemplate>
