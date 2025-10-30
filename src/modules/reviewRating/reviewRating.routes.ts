import { Router } from 'express'
import {
  createReview,
  deleteReview,
  getReviewsByClassId,
  getReviewsByTripId,
  getAllClassReviews,
} from './reviewRating.controller'
import auth from '../../middleware/auth'

const router = Router()

router.post('/', auth('user'), createReview)
router.delete('/:id', auth('admin'), deleteReview)
router.get('/class/:classId', getReviewsByClassId)
router.get('/product/:productId', getReviewsByTripId)
router.get('/all', getAllClassReviews)
export default router
