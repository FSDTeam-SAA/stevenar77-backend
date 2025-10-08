import { StatusCodes } from 'http-status-codes'
import AppError from '../../errors/AppError'
import { uploadToCloudinary } from '../../utils/cloudinary'
import { IProduct, IVariant } from './product.interface'
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

export const updateProduct = async (
  payload: Partial<IProduct>,
  productId: string,
  files: Express.Multer.File[]
) => {
  const existing = await Product.findById(productId)
  if (!existing) throw new AppError('Product not found', StatusCodes.NOT_FOUND)

  const productImages: { public_id: string; url: string }[] = [
    ...(existing.images || []),
  ]
  const variantImages: Record<string, { public_id: string; url: string }> = {}

  // 1️⃣ Upload all files
  for (const file of files) {
    if (file.fieldname.startsWith('variant_')) {
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

  // 2️⃣ Handle variants
  let updatedVariants: IVariant[] = existing.variants || []

  if (Array.isArray(payload.variants)) {
    updatedVariants = payload.variants.map((v, i): IVariant => {
      const existingVariant = existing.variants?.[i]
      const uploadedImage = variantImages[i]

      return {
        title: v.title ?? existingVariant?.title ?? '',
        quantity: Number(v.quantity ?? existingVariant?.quantity ?? 0),
        image:
          uploadedImage !== undefined
            ? uploadedImage // নতুন ইমেজ আপলোড হলে সেটাও ব্যবহার করো
            : v.image === null
            ? null // যদি ক্লায়েন্ট থেকে ইমেজ null পাঠায়, তাহলে মুছে ফেলো
            : existingVariant?.image || null, // না থাকলে পুরনোটা রাখো
      }
    })
  }

  // 3️⃣ Merge data
  const updateData: Partial<IProduct> = {
    ...payload,
    price: payload.price ? Number(payload.price) : existing.price,
    quantity: payload.quantity ? Number(payload.quantity) : existing.quantity,
    images: productImages.length > 0 ? productImages : existing.images,
    variants: updatedVariants,
  }

  // 4️⃣ Update DB
  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    updateData,
    {
      new: true,
      runValidators: true,
    }
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
