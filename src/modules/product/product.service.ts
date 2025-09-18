// import { StatusCodes } from "http-status-codes";
// import AppError from "../../errors/AppError";
// import { uploadToCloudinary } from "../../utils/cloudinary";
// import { IProduct } from "./product.interface";
// import Product from "./product.model";

// const addProduct = async (payload: IProduct, files: Express.Multer.File[]) => {
//   // eslint-disable-next-line prefer-const
//   let images: { public_id: string; url: string }[] = [];

//   if (files && files.length > 0) {
//     for (const file of files) {
//       const uploadResult = await uploadToCloudinary(file.path, "products");
//       if (uploadResult) {
//         images.push({
//           public_id: uploadResult.public_id,
//           url: uploadResult.secure_url,
//         });
//       }
//     }
//   } else {
//     throw new AppError(
//       "At least one image is required",
//       StatusCodes.BAD_REQUEST
//     );
//   }

//   const productData = {
//     ...payload,
//     price: Number(payload.price),
//     images,
//   };

//   const result = await Product.create(productData);
//   return result;
// };

// const getAllProducts = async (filters: any) => {
//   const {
//     category,
//     search,
//     minPrice,
//     maxPrice,
//     inStock,
//     page = 1,
//     limit = 10,
//   } = filters;

//   const query: any = {};

//   if (category) {
//     query.category = category;
//   }

//   if (search) {
//     query.$or = [
//       { title: { $regex: search, $options: "i" } },
//       { shortDescription: { $regex: search, $options: "i" } },
//     ];
//   }

//   if (minPrice || maxPrice) {
//     query.price = {};
//     if (minPrice) query.price.$gte = Number(minPrice);
//     if (maxPrice) query.price.$lte = Number(maxPrice);
//   }

//   if (inStock !== undefined) {
//     query.inStock = inStock === "true"; // from query param
//   }

//   const skip = (Number(page) - 1) * Number(limit);

//   // Count total products for pagination
//   const totalProducts = await Product.countDocuments(query);

//   // Get paginated products
//   const products = await Product.find(query).skip(skip).limit(Number(limit));

//   // Get category counts
//   const categoryCounts = await Product.aggregate([
//     {
//       $group: {
//         _id: "$category",
//         count: { $sum: 1 },
//       },
//     },
//   ]);

//   return {
//     products,
//     categoryCounts,
//     meta: {
//       totalProducts,
//       page: Number(page),
//       limit: Number(limit),
//       totalPages: Math.ceil(totalProducts / Number(limit)),
//     },
//   };
// };

// const getSingleProduct = async (productId: string) => {
//   const result = await Product.findById(productId);
//   return result;
// };

// const updateProduct = async (
//   payload: Partial<IProduct>,
//   productId: string,
//   files: Express.Multer.File[]
// ) => {
//   const product = await Product.findById(productId);
//   if (!product) {
//     throw new AppError("Product not found", StatusCodes.NOT_FOUND);
//   }

//   let images = product.images || [];

//   // If new files are uploaded
//   if (files && files.length > 0) {
//     // Optional: delete old images from Cloudinary if you want
//     // for (const img of product.images) {
//     //   await deleteFromCloudinary(img.public_id);
//     // }

//     const uploadPromises = files.map((file) =>
//       uploadToCloudinary(file.path, "products")
//     );

//     const uploadedResults = await Promise.all(uploadPromises);

//     images = uploadedResults.map((result) => ({
//       public_id: result.public_id,
//       url: result.secure_url,
//     }));
//   }

//   // Merge new payload with old product
//   const updatedProduct = await Product.findByIdAndUpdate(
//     productId,
//     {
//       ...payload,
//       price: payload.price ? Number(payload.price) : product.price,
//       images, // replace old images if new ones uploaded
//     },
//     { new: true, runValidators: true }
//   );

//   return updatedProduct;
// };

// const deleteProduct = async (productId: string) => {
//   const product = await Product.findById(productId);
//   if (!product) {
//     throw new AppError("Product not found", StatusCodes.NOT_FOUND);
//   }

//   await Product.findByIdAndDelete(productId);
// };

// const productService = {
//   addProduct,
//   getAllProducts,
//   getSingleProduct,
//   updateProduct,
//   deleteProduct,
// };

// export default productService;
