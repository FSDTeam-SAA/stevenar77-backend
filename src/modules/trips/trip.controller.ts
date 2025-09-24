import { StatusCodes } from "http-status-codes";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import TripService from "./trip.service";

// Create Trip
const createTrip = catchAsync(async (req, res) => {
  const files: any[] = req.files as any[];
  const result = await TripService.createTrip(req.body, files);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Trip created successfully",
    data: result,
  });
});

// Get All Trips
const getAllTrips = catchAsync(async (req, res) => {
  // read query params (default page=1, limit=10)
  const { page = 1, limit = 10 } = req.query;

  const result = await TripService.getAllTrips(Number(page), Number(limit));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Trips fetched successfully",
    data: result,
  });
});

// Get Single Trip
const getSingleTrip = catchAsync(async (req, res) => {
  const { tripId } = req.params;
  const result = await TripService.getSingleTrip(tripId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Trip fetched successfully",
    data: result,
  });
});

// Update Trip
const updateTrip = catchAsync(async (req, res) => {
  const { tripId } = req.params;
  const files: any[] = req.files as any[];
  const result = await TripService.updateTrip(tripId, req.body, files);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Trip updated successfully",
    data: result,
  });
});

// Delete Trip
const deleteTrip = catchAsync(async (req, res) => {
  const { tripId } = req.params;
  const result = await TripService.deleteTrip(tripId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
  });
});

const TripController = {
  createTrip,
  getAllTrips,
  getSingleTrip,
  updateTrip,
  deleteTrip,
};

export default TripController;
