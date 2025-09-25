import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from '../../utils/cloudinary'
import Trip from './trip.model'
import { ITrip } from './trips.interface'

const createTrip = async (payload: ITrip, files: any[]) => {
  let images: { public_id: string; url: string }[] = []

  if (files && files.length > 0) {
    const uploadPromises = files.map((file) =>
      uploadToCloudinary(file.path, 'Trips')
    )
    const uploadedResults = await Promise.all(uploadPromises)

    images = uploadedResults.map((uploaded) => ({
      public_id: uploaded.public_id !== undefined ? uploaded.public_id : '',
      url: uploaded.secure_url,
    }))

    if (payload.images && payload.images.length > 0) {
      const oldImagesPublicIds = payload.images.map(
        (img) => img.public_id ?? ''
      )
      await Promise.all(
        oldImagesPublicIds.map((publicId) => deleteFromCloudinary(publicId))
      )
    }
  } else {
    images = (payload.images || []).map((img) => ({
      public_id: img.public_id ?? '',
      url: img.url ?? '',
    }))
  }

  // ✅ use lowercase variable, not `const Trip`
  const trip = await Trip.create({
    ...payload,
    images,
  })

  return trip
}

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
  // @ts-expect-error: payload.images may be undefined, so we need to handle this case
  let images: { public_id: string; url: string }[] = payload.images || []

  if (files && files.length > 0) {
    const uploadPromises = files.map((file) =>
      uploadToCloudinary(file.path, 'Trips')
    )
    const uploadedResults = await Promise.all(uploadPromises)

    images = uploadedResults.map((uploaded) => ({
      public_id: uploaded.public_id,
      url: uploaded.secure_url,
    }))

    if (payload.images && payload.images.length > 0) {
      const oldImagesPublicIds = payload.images.map(
        (img) => img.public_id ?? ''
      )
      await Promise.all(
        oldImagesPublicIds.map((publicId) => deleteFromCloudinary(publicId))
      )
    }
  }

   // ----- index logic -----
  const trip = await Trip.findById(tripId)
  if (!trip) throw new Error("Trip not found")

  if (
    payload.index !== undefined &&
    trip.index !== undefined &&
    payload.index !== trip.index
  ) {
    const oldIndex = trip.index
    const newIndex = payload.index

    if (newIndex < oldIndex) {
      // Moving UP: shift everything down
      await Trip.updateMany(
        { index: { $gte: newIndex, $lt: oldIndex } },
        { $inc: { index: 1 } }
      )
    } else if (newIndex > oldIndex) {
      // Moving DOWN: shift everything up
      await Trip.updateMany(
        { index: { $lte: newIndex, $gt: oldIndex } },
        { $inc: { index: -1 } }
      )
    }
  }


  const updatedTrip = await Trip.findByIdAndUpdate(
    tripId,
    { ...payload, images },
    { new: true }
  )

  return updatedTrip
}

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
