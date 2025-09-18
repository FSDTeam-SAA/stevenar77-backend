import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import {
  createDraftOrder,
  getQuote,
  getStoreProductWithPrices,
  ProductService,
  submitDraftOrder,
} from "./shop.service";

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