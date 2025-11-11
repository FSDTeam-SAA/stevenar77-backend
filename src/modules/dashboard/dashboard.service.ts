import { BookingClass } from "../bookingClass/bookingClass.model";
import { Class } from "../class/class.model";
import order from "../order/order.model";
import Booking from "../trips/booking/booking.model";

const getDashboardStats = async () => {
  const totalClassBookings = await BookingClass.countDocuments({});
  const totalTripBookings = await Booking.countDocuments({});
  const totalBookings = totalClassBookings + totalTripBookings;

  const paidOrders = await order.find({ status: "paid" });

  const totalPaidOrders = paidOrders.length;
  const totalSales = paidOrders.reduce((sum, ord) => sum + ord.totalPrice, 0);

  const classRevenueAgg = await BookingClass.aggregate([
    { $match: { status: "paid" } },
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
    { $match: { status: "paid" } },
    {
      $group: {
        _id: null,
        total: { $sum: "$totalPrice" },
      },
    },
  ]);

  const totalRevenue =
    (classRevenueAgg[0]?.total || 0) +
    (tripRevenueAgg[0]?.total || 0) +
    totalSales;

  const popularCoursesCount = await Class.countDocuments({
    totalReviews: { $gt: 0 },
    avgRating: { $gt: 0 },
  });

  return {
    totalBookings,
    totalRevenue,
    popularCoursesCount,
    totalPaidOrders,
    totalSales,
    orders: paidOrders,
  };
};

const getChartData = async (year: any) => {
  const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

  // Class revenue grouped by month
  const classRevenue = await BookingClass.aggregate([
    {
      $match: {
        status: "paid",
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        //!Possible issue there multiply by participant count with totalPrice
        total: {
          $sum: { $multiply: ["$participant", { $avg: "$totalPrice" }] },
        }, // adjust if price is elsewhere
      },
    },
  ]);

  // Trip revenue grouped by month
  const tripRevenue = await Booking.aggregate([
    {
      $match: {
        status: "paid",
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        total: { $sum: "$totalPrice" },
      },
    },
  ]);

  // Merge results
  const revenueMap: Record<number, number> = {};
  classRevenue.forEach((item) => {
    revenueMap[item._id] = (revenueMap[item._id] || 0) + item.total;
  });
  tripRevenue.forEach((item) => {
    revenueMap[item._id] = (revenueMap[item._id] || 0) + item.total;
  });

  // Build chart data for 12 months
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months.map((month, index) => ({
    month,
    revenue: revenueMap[index + 1] || 0,
  }));
};

export const dashboardService = {
  getDashboardStats,
  getChartData,
};
