import { StatusCodes } from 'http-status-codes'
import AppError from '../../errors/AppError'
import { uploadToCloudinary } from '../../utils/cloudinary'
import { IProduct } from './product.interface'
import Product from './product.model'

export const addProduct = async (
  payload: IProduct,
  files: Express.Multer.File[]
) => {
  const productImages: { public_id: string; url: string }[] = []
  const variantImages: Record<string, { public_id: string; url: string }> = {}

  // 1️⃣ Upload all files
  for (const file of files) {
    // detect which file belongs to variant or main product
    // Use file.fieldname to detect
    if (file.fieldname.startsWith('variant_')) {
      // e.g. fieldname = "variant_0", "variant_1"
      const index = file.fieldname.split('_')[1]
      const uploadResult = await uploadToCloudinary(
        file.path,
        'products/variants'
      )
      if (uploadResult) {
        variantImages[index] = {
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
        }
      }
    } else {
      const uploadResult = await uploadToCloudinary(file.path, 'products')
      if (uploadResult) {
        productImages.push({
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
        })
      }
    }
  }

  // 2️⃣ Assign uploaded variant images back to variants
  const variants = Array.isArray(payload.variants)
    ? payload.variants.map((v, i) => ({
        ...v,
        image: variantImages[i] || (v as any).image || null,
        quantity: Number(v.quantity),
      }))
    : []

  // 3️⃣ Prepare full product data
  const productData = {
    ...payload,
    price: Number(payload.price),
    quantity: Number(payload.quantity),
    images: productImages,
    variants,
  }

  // 4️⃣ Save to DB
  const result = await Product.create(productData)
  return result
}

const getAllProducts = async (filters: any) => {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    inStock,
    page = 1,
    limit = 10,
  } = filters

  const query: any = {}

  if (category) {
    query.category = category
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { shortDescription: { $regex: search, $options: 'i' } },
    ]
  }

  if (minPrice || maxPrice) {
    query.price = {}
    if (minPrice) query.price.$gte = Number(minPrice)
    if (maxPrice) query.price.$lte = Number(maxPrice)
  }

  if (inStock !== undefined) {
    query.inStock = inStock === 'true' // from query param
  }

  const skip = (Number(page) - 1) * Number(limit)

  // Count total products for pagination
  const totalProducts = await Product.countDocuments(query)

  // Get paginated products
  const products = await Product.find(query).skip(skip).limit(Number(limit))

  // Get category counts
  const categoryCounts = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
      },
    },
  ])

  return {
    products,
    categoryCounts,
    meta: {
      totalProducts,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalProducts / Number(limit)),
    },
  }
}

const getSingleProduct = async (productId: string) => {
  const result = await Product.findById(productId)
  return result
}

const updateProduct = async (
  payload: Partial<IProduct>,
  productId: string,
  files: Express.Multer.File[]
) => {
  const product = await Product.findById(productId)
  if (!product) {
    throw new AppError('Product not found', StatusCodes.NOT_FOUND)
  }

  let images = product.images || []

  // If new files are uploaded
  if (files && files.length > 0) {
    // Optional: delete old images from Cloudinary if you want
    // for (const img of product.images) {
    //   await deleteFromCloudinary(img.public_id);
    // }

    const uploadPromises = files.map((file) =>
      uploadToCloudinary(file.path, 'products')
    )

    const uploadedResults = await Promise.all(uploadPromises)

    images = uploadedResults.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }))
  }

  // Merge new payload with old product
  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    {
      ...payload,
      price: payload.price ? Number(payload.price) : product.price,
      images, // replace old images if new ones uploaded
    },
    { new: true, runValidators: true }
  )

  return updatedProduct
}

const deleteProduct = async (productId: string) => {
  const product = await Product.findById(productId)
  if (!product) {
    throw new AppError('Product not found', StatusCodes.NOT_FOUND)
  }

  await Product.findByIdAndDelete(productId)
}

const productService = {
  addProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
}

export default productService
