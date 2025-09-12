import { Request, Response } from 'express';
import { TripBookingService } from './booking.service';

export class TripBookingController {

  /**
   * Create a Stripe Checkout session for a trip booking
   */
  static async createCheckoutSession(req: Request, res: Response): Promise<void> {
  try {
    const { tripId } = req.params;
    const { participants } = req.body;
    const userId = req.user?.id;

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      res.status(400).json({ message: 'Participants are required' });
      return; 
    }

    const { sessionUrl, bookingId } = await TripBookingService.createCheckoutSession(
      tripId,
      userId,
      participants
    );

    res.status(200).json({
      success: true,
      message: 'Checkout session created successfully',
      data: { sessionUrl, bookingId }
    });

  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create checkout session',
    });
  }
}

}
