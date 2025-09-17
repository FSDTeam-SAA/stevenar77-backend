import express from 'express'
import {
  getAllNotifications,
  getUserNotifications,
  markAllAsRead,
} from './notification.controller'
import auth from '../../middleware/auth'

const router = express.Router()

router.get('/', auth('admin'), getAllNotifications)

router.get('/:userId', getUserNotifications)
router.patch('/read/:userId', markAllAsRead)

export default router
