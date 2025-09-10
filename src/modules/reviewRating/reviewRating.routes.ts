import { Router } from 'express'
import {
  createReview,
  deleteReview,
  getReviewsByClassId,
  getReviewsByTripId,
} from './reviewRating.controller'
import auth from '../../middleware/auth'

const router = Router()

router.post('/', auth('user'), createReview)
router.delete('/:id', auth('user'), deleteReview)
router.get('/class/:classId', getReviewsByClassId)
router.get('/trip/:tripId', getReviewsByTripId)

export default router
