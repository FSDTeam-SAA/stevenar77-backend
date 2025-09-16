import { Router } from 'express'
import { getMessages, createMessage } from './message.controller'

const router = Router()
router.get('/:conversationId', getMessages)
router.post('/', createMessage)
export default router
