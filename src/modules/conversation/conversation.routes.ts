import { Router } from 'express'
import {
  getUserConversations,
  createConversation,
  deleteConversation,
  allConversations,
} from './conversation.controller'
import auth from '../../middleware/auth'

const router = Router()

// Assuming you have authentication middleware that sets req.user
router.get('/:userId', getUserConversations)
router.post('/', createConversation)
router.delete('/:id', deleteConversation)
router.get('/',auth('admin'), allConversations)

export default router
