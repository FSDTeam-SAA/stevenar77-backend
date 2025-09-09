import { Router } from 'express'
import {
  createReview,
  deleteReview,
  getReviewsByDriverId,
} from './reviewRating.controller'
import auth from '../../middleware/auth'

const router = Router()

router.post('/', auth('user'), createReview)
router.delete('/:id', auth('user'), deleteReview)
router.get('/driver/:driverId', auth('user'), getReviewsByDriverId)

export default router
