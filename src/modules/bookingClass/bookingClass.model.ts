import mongoose, { Schema } from 'mongoose'
import { BookingClassModel, IBookingClass } from './bookingClass.interface'

const bookingClassSchema = new Schema<IBookingClass>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    participant: { type: Number, required: true },
    classDate: [{ type: Date, required: true }],

    medicalDocuments: [
  {
    public_id: String,
    url: String,
  }
],
 form: {
      type: Schema.Types.Mixed, 
      default: null,
    },

    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending',
    },
    stripePaymentIntentId: { type: String },
    gender: { type: String, enum: ['male', 'female'], required: true },
    shoeSize: { type: Number, required: true },
    hight: { type: Number, required: true },
    weight: { type: Number, required: true },
  },
  { timestamps: true }
)

export const BookingClass = mongoose.model<IBookingClass, BookingClassModel>(
  'BookingClass',
  bookingClassSchema
)
