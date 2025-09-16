import { Router } from 'express'
import {
  getUserConversations,
  createConversation,
  deleteConversation,
} from './conversation.controller'

const router = Router()

// Assuming you have authentication middleware that sets req.user
router.get('/:userId', getUserConversations)
router.post('/', createConversation)
router.delete('/:id', deleteConversation)

export default router
