import mongoose, { Schema, Document, model } from 'mongoose';

export interface ITripBooking extends Document {
  trip: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  totalParticipants:number;
  participants: {
    firstName: string;
    lastName: string;
    email: string;
    mobile:number;
  }[];
  totalPrice: number;
  status: 'pending' | 'paid' | 'cancelled';
  stripePaymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const tripBookingSchema = new Schema<ITripBooking>(
  {
    trip: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User'},
    participants: [
      {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true },
        mobile:{type:Number,required:true}
      },
    ],
     totalParticipants:{type:Number,required:true},
    totalPrice: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
    stripePaymentIntentId: { type: String },
  },
  { timestamps: true }
);

const Booking =model<ITripBooking>('TripBooking', tripBookingSchema);
export default Booking
