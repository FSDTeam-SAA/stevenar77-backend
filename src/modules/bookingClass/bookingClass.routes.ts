import express from 'express'
import {
  createBooking,
  deleteBooking,
  getUserBookings,
  getSingleBooking,
  changeBookingStatus,
} from './bookingClass.controller'
import auth from '../../middleware/auth'

const router = express.Router()

// Create booking
router.post('/', auth('admin'), createBooking)

// Delete booking
router.delete('/:id', auth('user'), deleteBooking)

// Get all bookings for logged-in user
router.get('/my-bookings', auth('user'), getUserBookings)

// Get single booking
router.get('/:id', auth('user'), getSingleBooking)

// Change booking status
router.put('/:id/status', auth('admin'), changeBookingStatus)

const bookingClassRoutes = router
export default bookingClassRoutes
