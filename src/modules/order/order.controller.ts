import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import orderService from "./order.service";

const createOrder = catchAsync(async (req, res) => {
  const { email } = req.user;
  const files = req.files as Express.Multer.File[];
  const result = await orderService.createOrder(email, req.body, files);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Add to cart successful!",
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
/**
 * GET /api/orders/paid
 * Returns all orders with paymentStatus = "paid"
 */
const fetchPaidOrders = async (req: Request, res: Response) => {
  try {
    const orders = await orderService.getAllPaid();

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Paid orders retrieved successfully",
      data: orders,
    });
    return;
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

const deleteAllOrderClass = catchAsync(async (req, res) => {
  const {orderIds } = req.body;
  await orderService.deleteAllOrderClass(orderIds);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Orders deleted successfully",
  });
});

const orderController = {
  createOrder,
  getMyOder,
  getAllOrder,
  orderCancelByUser,
  updateOrderStatus,
  fetchPaidOrders,
  deleteAllOrderClass,
};

export default orderController;
