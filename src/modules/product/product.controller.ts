import { StatusCodes } from "http-status-codes";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import productService from "./product.service";
import AppError from "../../errors/AppError";

const addProduct = catchAsync(async (req, res) => {
  const files = req.files as any[];

  // Parse variants string into JSON
  let variants = [];
  if (req.body.variants) {
    try {
      variants = JSON.parse(req.body.variants);
    } catch (err) {
      try {
        variants = JSON.parse(req.body.variants.replace(/'/g, '"'));
      } catch (err2) {
        throw new AppError("Invalid JSON format for variants", StatusCodes.BAD_REQUEST);
      }
    }
  }

  // ✅ merge parsed variants into payload
  const payload = {
    ...req.body,
    variants,
  };

  const result = await productService.addProduct(payload, files);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product created successfully",
    data: result,
  });
});


const getAllProducts = catchAsync(async (req, res) => {
  const result = await productService.getAllProducts(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Products fetched successfully",
    data: result,
  });
});

const getSingleProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await productService.getSingleProduct(productId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product fetched successfully",
    data: result,
  });
});

const updateProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const files = req.files as any[];
  const result = await productService.updateProduct(req.body, productId, files);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product updated successfully",
    data: result,
  });
});

const deleteProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  await productService.deleteProduct(productId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product deleted successfully",
  });
});

export const productController = {
  addProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
};
