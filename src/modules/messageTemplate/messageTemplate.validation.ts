import { z } from 'zod'

const createMessageTemplateSchema = z.object({
  body: z.object({
    tempName: z.string().min(1, 'Template name is required'),
    emailSubject: z.string().min(1, 'Email subject is required'),
    type: z.enum(['trips', 'product', 'courses']),
    messageBody: z.string().min(1, 'Message body is required'),
  }),
})

const updateMessageTemplateSchema = z.object({
  body: z.object({
    tempName: z.string().optional(),
    emailSubject: z.string().optional(),
    type: z.enum(['trips', 'product', 'courses']).optional(),
    status: z.enum(['active', 'deactivate.']).optional(),
    messageBody: z.string().optional(),
  }),
})

export const messageTemplateValidation = {
  createMessageTemplateSchema,
  updateMessageTemplateSchema,
}
