import { BookingClass } from "../bookingClass/bookingClass.model";
import { Class } from "../class/class.model";
import Booking from "../trips/booking/booking.model";

const getDashboardStats = async () => {
  const totalClassBookings = await BookingClass.countDocuments({});
  const totalTripBookings = await Booking.countDocuments({});
  const totalBookings = totalClassBookings + totalTripBookings;

  const classRevenueAgg = await BookingClass.aggregate([
    { $match: { status: "success" } },
    {
      $group: {
        _id: null,
        //!Possible issue there multiply by participant count with totalPrice
        total: {
          $sum: { $multiply: ["$participant", { $avg: "$totalPrice" }] },
        }, // if price exists
      },
    },
  ]);

  const tripRevenueAgg = await Booking.aggregate([
    { $match: { status: "success" } },
    {
      $group: {
        _id: null,
        total: { $sum: "$totalPrice" },
      },
    },
  ]);

  const totalRevenue =
    (classRevenueAgg[0]?.total || 0) + (tripRevenueAgg[0]?.total || 0);

  const popularCoursesCount = await Class.countDocuments({
    totalReviews: { $gt: 0 },
    avgRating: { $gt: 0 },
  });

  return {
    totalBookings,
    totalRevenue,
    popularCoursesCount,
  };
};

export const dashboardService = {
  getDashboardStats,
};
