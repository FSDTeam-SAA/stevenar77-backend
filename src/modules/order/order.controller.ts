import { StatusCodes } from "http-status-codes";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import orderService from "./order.service";

const createOrder = catchAsync(async (req, res) => {
  const { email } = req.user;
  const result = await orderService.createOrder(email, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Order created successfully",
    data: result,
  });
});

const getMyOder = catchAsync(async (req, res) => {
  const { email } = req.user;
  const result = await orderService.getMyOder(email);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Order fetched successfully",
    data: result,
  });
});

const orderController = {
  createOrder,
  getMyOder,
};

export default orderController;
