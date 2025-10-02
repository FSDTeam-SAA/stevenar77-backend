import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from '../../utils/cloudinary'
import Trip from './trip.model'
import { ITrip } from './trips.interface'

const createTrip = async (payload: ITrip, files: any[]) => {
  let images: { public_id: string; url: string }[] = [];

  const { index, ...rest } = payload; // ✅ use payload, not req.body

  // ----- Handle file uploads -----
  if (files && files.length > 0) {
    const uploadPromises = files.map((file) =>
      uploadToCloudinary(file.path, "Trips")
    );
    const uploadedResults = await Promise.all(uploadPromises);

    images = uploadedResults.map((uploaded) => ({
      public_id: uploaded.public_id ?? "",
      url: uploaded.secure_url,
    }));

    // Delete old images if provided
    if (payload.images && payload.images.length > 0) {
      const oldImagesPublicIds = payload.images.map(
        (img) => img.public_id ?? ""
      );
      await Promise.all(
        oldImagesPublicIds.map((publicId) => deleteFromCloudinary(publicId))
      );
    }
  } else {
    images = (payload.images || []).map((img) => ({
      public_id: img.public_id ?? "",
      url: img.url ?? "",
    }));
  }

  // ----- Handle index logic -----
  let insertIndex: number;

  if (index !== undefined) {
    const newIndex = Number(index);

    // Shift trips >= newIndex
    await Trip.updateMany(
      { index: { $gte: newIndex } },
      { $inc: { index: 1 } }
    );

    insertIndex = newIndex;
  } else {
    // Append at the end if no index passed
    const maxIndexTrip = await Trip.findOne().sort({ index: -1 });
    insertIndex = maxIndexTrip ? ((maxIndexTrip.index ?? 0) + 1) : 1;
  }

  // ----- Create trip -----
  const trip = await Trip.create({
    ...rest,
    index: insertIndex,
    images,
  });

  return trip;
};


const getAllTrips = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  // Fetch paginated & sorted trips
  const trips = await Trip.find()
    .sort({ index: 1 })     // ascending order by index field
    .skip(skip)            
    .limit(limit);          

  // Optionally get total count for pagination metadata
  const total = await Trip.countDocuments();

  return {
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    totalTrips: total,
    data: trips,
  };
};

const getSingleTrip = async (tripId: string) => {
  return await Trip.findById(tripId)
}

const updateTrip = async (
  tripId: string,
  payload: Partial<ITrip>,
  files?: any[]
) => {
  let images: { public_id: string; url: string }[] = [];

  // ----- Handle new image uploads -----
  if (files && files.length > 0) {
    const uploadResults = await Promise.all(
      files.map((file) => uploadToCloudinary(file.path, 'Trips'))
    );

    images = uploadResults.map((uploaded) => ({
      public_id: uploaded.public_id,
      url: uploaded.secure_url,
    }));
  }

  // ----- Index logic -----
  const trip = await Trip.findById(tripId);
  if (!trip) throw new Error("Trip not found");

  if (
    payload.index !== undefined &&
    trip.index !== undefined &&
    payload.index !== trip.index
  ) {
    const oldIndex = trip.index;
    const newIndex = Number(payload.index);

    if (newIndex < oldIndex) {
      await Trip.updateMany(
        { _id: { $ne: tripId }, index: { $gte: newIndex, $lt: oldIndex } },
        { $inc: { index: 1 } }
      );
    } else if (newIndex > oldIndex) {
      await Trip.updateMany(
        { _id: { $ne: tripId }, index: { $gt: oldIndex, $lte: newIndex } },
        { $inc: { index: -1 } }
      );
    }

    trip.index = newIndex;
    await trip.save();
  }

  // ----- Prepare update object -----
  const updateData: Partial<ITrip> = { ...payload };
  if (images.length > 0) {
    updateData.images = images; // only update if new images exist
  }

  const updatedTrip = await Trip.findByIdAndUpdate(tripId, updateData, {
    new: true,
  });

  return updatedTrip;
};


const deleteTrip = async (tripId: string) => {
  // ✅ use lowercase variable name
  const trip = await Trip.findById(tripId)
  if (!trip) throw new Error('Trip not found')

  if (trip.images && trip.images.length > 0) {
    await Promise.all(
      trip.images.map((img) => deleteFromCloudinary(img.public_id ?? ''))
    )
  }

  await Trip.findByIdAndDelete(tripId)
  return { message: 'Trip deleted successfully' }
}

const TripService = {
  createTrip,
  getAllTrips,
  getSingleTrip,
  updateTrip,
  deleteTrip,
}

export default TripService
