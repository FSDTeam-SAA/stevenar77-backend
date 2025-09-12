import express from "express";
import TripController from "./trip.controller";
import { upload } from "../../middleware/multer.middleware";
import auth from "../../middleware/auth";
import { TripBookingController } from "./booking/booking.controller";
import { USER_ROLE } from "../user/user.constant";
 // ✅ assuming you use Multer for file upload

const router = express.Router();

// Create Trip (with image upload)
router.post("/create", upload.array("images"), TripController.createTrip);

// Get all Trips
router.get("/all", TripController.getAllTrips);

// Get single Trip
router.get("/:tripId", TripController.getSingleTrip);

// Update Trip (with image upload)
router.put("/:tripId", upload.array("images"), TripController.updateTrip);

// Delete Trip
router.delete("/:tripId", TripController.deleteTrip);

router.post(
  '/:tripId/checkout',
    auth(USER_ROLE.ADMIN, USER_ROLE.USER),
  TripBookingController.createCheckoutSession
);

 const TripRoutes = router;

 export default TripRoutes

