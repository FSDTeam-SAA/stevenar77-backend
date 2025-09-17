import { StatusCodes } from "http-status-codes";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { dashboardService } from "./dashboard.service";

const getAdminDashboardStats = catchAsync(async (req, res) => {
  const result = await dashboardService.getDashboardStats();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Dashboard stats fetched successfully",
    data: result,
  });
});

const getChartData = catchAsync(async (req, res) => {
  const yearQuery = Array.isArray(req.query.year)
    ? req.query.year[0]
    : req.query.year;
  const year = yearQuery
    ? parseInt(yearQuery as string, 10)
    : new Date().getFullYear();

  const result = await dashboardService.getChartData(year);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Dashboard stats fetched successfully",
    data: result,
  });
});

const dashboardController = {
  getAdminDashboardStats,
  getChartData,
};

export default dashboardController;
