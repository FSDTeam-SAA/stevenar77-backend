import mongoose, { Schema } from 'mongoose'
import { BookingClassModel, IBookingClass } from './bookingClass.interface'

const bookingClassSchema = new Schema<IBookingClass>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participant: { type: Number },
    classDate: [{ type: Date }],

    medicalDocuments: [
      {
        public_id: String,
        url: String,
      },
    ],
    form: {
      type: Schema.Types.Mixed,
      default: null,
    },

    totalPrice: { type: Number },
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending',
    },
    stripePaymentIntentId: { type: String },
    gender: { type: String, enum: ['male', 'female'] },
    shoeSize: { type: Number },
    hight: {
      type: String,
      required: true,
    },
    weight: { type: Number },

    Username: { type: String },
    email: { type: String },
    phoneNumber: { type: String },

    emergencyName: { type: String },
    emergencyPhoneNumber: { type: String },
    scheduleId: { type: Schema.Types.ObjectId, required: true },

  },
  { timestamps: true }
)

export const BookingClass = mongoose.model<IBookingClass, BookingClassModel>(
  'BookingClass',
  bookingClassSchema
)
