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

const getChartData = async (year: number) => {
  const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

  // ---- BookingClass ----
  const classRevenue = await BookingClass.aggregate([
    {
      $match: { status: "paid", createdAt: { $gte: startDate, $lte: endDate } },
    },
    {
      $project: {
        month: { $month: "$createdAt" },
        participant: { $ifNull: ["$participant", 0] },
        totalPriceNum: {
          $convert: {
            input: "$totalPrice",
            to: "double",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    {
      $project: {
        month: 1,
        revenue: {
          $cond: [
            { $gt: ["$participant", 0] },
            { $multiply: ["$participant", "$totalPriceNum"] },
            "$totalPriceNum",
          ],
        },
      },
    },
    { $group: { _id: "$month", total: { $sum: "$revenue" } } },
  ]);

  // ---- Booking (trips) ----
  const tripRevenue = await Booking.aggregate([
    {
      $match: { status: "paid", createdAt: { $gte: startDate, $lte: endDate } },
    },
    {
      $project: {
        month: { $month: "$createdAt" },
        revenue: {
          $convert: {
            input: "$totalPrice",
            to: "double",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    { $group: { _id: "$month", total: { $sum: "$revenue" } } },
  ]);

  // ---- Merge Results ----
  const revenueMap: Record<number, number> = {};
  classRevenue.forEach((it: any) => {
    revenueMap[it._id] = (revenueMap[it._id] || 0) + (it.total || 0);
  });
  tripRevenue.forEach((it: any) => {
    revenueMap[it._id] = (revenueMap[it._id] || 0) + (it.total || 0);
  });

  // ---- Build Month Data ----
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
    revenue: +(revenueMap[index + 1] || 0),
  }));
};


export const dashboardService = {
  getDashboardStats,
  getChartData,
};
