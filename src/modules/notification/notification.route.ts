import express from 'express'
import {
  getUserNotifications,
  markAllAsRead,
} from './notification.controller'

const router = express.Router()

router.get('/:userId', getUserNotifications)
router.patch('/read/:userId', markAllAsRead)

export default router
