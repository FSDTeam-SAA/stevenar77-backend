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
  const { page = 1, limit = 10 } = req.query;

  const result = await orderService.getMyOder(
    email,
    Number(page),
    Number(limit)
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Orders fetched successfully",
    data: result.orders,
    meta: result.meta,
  });
});

const getAllOrder = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const result = await orderService.getAllOrder(Number(page), Number(limit));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Orders fetched successfully",
    data: result.orders,
    meta: result.meta,
  });
});

const orderCancelByUser = catchAsync(async (req, res) => {
  const { email } = req.user;
  const { orderId } = req.params;

  const result = await orderService.orderCancelByUser(email, orderId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Order cancelled successfully",
    data: result,
  });
});

const updateOrderStatus = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const result = await orderService.updateOrderStatus(orderId, status);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Order status updated successfully",
    data: result,
  });
});

//!deleted api is not add. after add it

const orderController = {
  createOrder,
  getMyOder,
  getAllOrder,
  orderCancelByUser,
  updateOrderStatus,
};

export default orderController;
