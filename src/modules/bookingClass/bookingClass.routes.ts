import express from 'express'
import {
  createBooking,
  deleteBooking,
  getUserBookings,
  getSingleBooking,
  changeBookingStatus,
  getSuccessfulPayments,
  getBookings,
  sendFormLinkToUser,
  submitBookingForm,
} from './bookingClass.controller'
import auth from '../../middleware/auth'
import { upload } from '../../middleware/multer.middleware'

const router = express.Router()

// Get all bookings
router.get('/all-bookings', auth('admin'), getBookings)

// Create booking
router.post(
  '/',
  auth('admin', 'user'),
  upload.array('medicalDocuments'),
  createBooking
)
router.post('/send-form-link', auth('admin'), sendFormLinkToUser)
router.patch(
  '/:userId/submit-form',
  auth('user'),
  upload.array('documents'), 
  submitBookingForm
)

// Delete booking
router.delete('/:id', auth('user'), deleteBooking)

// Get all bookings for logged-in user
router.get('/my-bookings', auth('user'), getUserBookings)

// Get single booking
router.get('/:id', auth('user'), getSingleBooking)

// Change booking status
router.put('/:id/status', auth('admin'), changeBookingStatus)

router.get('/payment/history', auth('admin'), getSuccessfulPayments)

const bookingClassRoutes = router
export default bookingClassRoutes
