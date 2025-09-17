import { BookingClass } from "../bookingClass/bookingClass.model";

const getDashboardStats = async () => {
  const totalBookings = await BookingClass.countDocuments();
  const popularCourses = await BookingClass.aggregate([
    {
      $group: {
        _id: "$classId",
        totalBookings: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "classes",
        localField: "_id",
        foreignField: "_id",
        as: "class",
      },
    },
    {
      $sort: {
        totalBookings: -1,
      },
    },
    {
      $limit: 5,
    },
  ]);

  const totalRevenue = await BookingClass.aggregate([
      
  ])


};

export const dashboardService = {
  getDashboardStats,
};
