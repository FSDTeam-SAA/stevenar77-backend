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

const dashboardController = {
  getAdminDashboardStats,
};

export default dashboardController;
