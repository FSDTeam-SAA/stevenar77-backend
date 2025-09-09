import mongoose, { Schema } from 'mongoose'
import { BookingClassModel, IBookingClass } from './bookingClass.interface'



const bookingClassSchema = new Schema<IBookingClass>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'canceled'],
      default: 'pending',
    },
    participant: { type: Number, required: true },
    classDate: [{ type: Date, required: true }], // array of dates
  },
  { timestamps: true }
)

export const BookingClass = mongoose.model<IBookingClass, BookingClassModel>(
  'BookingClass',
  bookingClassSchema
)
