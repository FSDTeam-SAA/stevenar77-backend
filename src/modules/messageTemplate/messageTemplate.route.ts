import { Router } from 'express'
import validateRequest from '../../middleware/validateRequest'
import { messageTemplateValidation } from './messageTemplate.validation'
import { messageTemplateController } from './messageTemplate.controller'

const router = Router()

router.post(
  '/',
  validateRequest(messageTemplateValidation.createMessageTemplateSchema),
  messageTemplateController.createTemplate
)

router.get('/', messageTemplateController.getAllTemplates)
router.get('/:id', messageTemplateController.getSingleTemplate)

router.put(
  '/:id',
  validateRequest(messageTemplateValidation.updateMessageTemplateSchema),
  messageTemplateController.updateTemplate
)

router.delete('/:id', messageTemplateController.deleteTemplate)

router.patch('/:id/status', messageTemplateController.updateStatus)

export const messageTemplateRouter = router
