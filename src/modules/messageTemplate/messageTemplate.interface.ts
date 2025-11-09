import { Model } from 'mongoose'

export interface IMessageTemplate {
  tempName: string
  emailSubject: string
  type: 'trips' | 'product' | 'courses'
  status: 'active' | 'deactivate'
  messageBody: string
}

export type MessageTemplateModel = Model<IMessageTemplate>
