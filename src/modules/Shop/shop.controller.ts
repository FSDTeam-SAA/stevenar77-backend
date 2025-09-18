import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import {
  createDraftOrder,
 
  getById,
 
  getGelatoOrderById,
 
  getQuote,
  getStoreProductWithPrices,
  ProductService,
  submitDraftOrder,
} from "./shop.service";
import orderService from "../order/order.service";

export const getProducts = catchAsync(async (req: Request, res: Response) => {
  const products = await ProductService.getStoreProducts();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Products fetched successfully",
    data: products,
  });
});

export const fetchProduct = catchAsync(async (req: Request, res: Response) => {
  const { productUid } = req.params;

  if (!productUid) {
    res.status(400).json({ message: "Product UID is required" });
    return;
  }

  try {
    const product = await getStoreProductWithPrices(productUid);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Products fetched successfully",
      data: product,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});


export const createDraftOrderController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user.id; // from auth middleware
    const orderData = req.body;
 const file = req.file as Express.Multer.File
    const newOrder = await createDraftOrder(userId, orderData);

    res.status(201).json({
      success: true,
      message: "Draft order created successfully",
      data: newOrder,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to create draft order",
    });
  }
};


/**
 * Controller to get quote for an order
 */
export const getOrderQuote = async (req: Request, res: Response) => {
  try {
    const { orderReferenceId } = req.body;

    if (!orderReferenceId) {
       res.status(400).json({
        success: false,
        message: "orderReferenceId is required",
      });
      return
    }

    const quote = await getQuote(orderReferenceId);

    res.status(200).json({
      success: true,
      message: "Quote fetched successfully",
      data: quote,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch quote",
    });
  }
};



// patch draft order to real order


export const submitDraftOrderController = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body; // expect { orderId: "..." }

    if (!orderId) {
     res.status(400).json({
        success: false,
        message: "orderId is required",
      });
       return 
    }

    const updatedOrder = await submitDraftOrder(orderId);

    res.status(200).json({
      success: true,
      message: "Draft order submitted successfully",
      data: updatedOrder,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to submit draft order",
    });
  }
};






/**
 * GET /api/orders/my
 * Returns all orders for the logged-in user
 */
export const getByIdController =async (req: Request, res: Response, next: NextFunction) =>{
  try {
    // req.user is set by auth middleware — extend Request type if needed
    const userId = req.user.id;

    const orders = await getById(userId);

     res.json({
      success: true,
      message: "Orders fetched successfully",
      data: orders,
    });
    return
  } catch (err) {
    next(err);
  }
}



export const getGelatoOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
       return
    }

    const apiKey = process.env.GELATO_API_KEY as string;
    if (!apiKey) {
      res.status(500).json({
        success: false,
        message: "Missing Gelato API key configuration",
      });
      return 
    }

    const order = await getGelatoOrderById(orderId, apiKey);

    res.json({
      success: true,
      message: "Gelato order fetched successfully",
      data: order,
    });
     return
  } catch (err) {
    next(err);
  }
};