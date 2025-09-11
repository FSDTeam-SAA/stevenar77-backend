import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/AppError";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { IProduct } from "./product.interface";
import Product from "./product.model";

const addProduct = async (payload: IProduct, files: Express.Multer.File[]) => {
  // eslint-disable-next-line prefer-const
  let images: { public_id: string; url: string }[] = [];

  if (files && files.length > 0) {
    for (const file of files) {
      const uploadResult = await uploadToCloudinary(file.path, "products");
      if (uploadResult) {
        images.push({
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
        });
      }
    }
  } else {
    throw new AppError(
      "At least one image is required",
      StatusCodes.BAD_REQUEST
    );
  }

  const productData = {
    ...payload,
    price: Number(payload.price),
    images,
  };

  const result = await Product.create(productData);
  return result;
};

const getAllProducts = async () => {
  const result = await Product.find();
  return result;
};

const getSingleProduct = async (productId: string) => {
  const result = await Product.findById(productId);
  return result;
};

const productService = {
  addProduct,
  getAllProducts,
  getSingleProduct,
};

export default productService;
