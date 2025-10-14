import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../utils/catchAsync'
import sendResponse from '../../utils/sendResponse'
import productService from './product.service'
import AppError from '../../errors/AppError'
import { IProduct } from './product.interface'

interface IVariant {
  title: string
  quantity: number
  image?: string | null
}

const addProduct = catchAsync(async (req, res) => {
  // Collect all uploaded files
  const files = req.files as Express.Multer.File[]

  // Separate main product images and variant images
  const mainImages = files.filter((f) => f.fieldname === 'image')
  const variantImages = files.filter((f) => f.fieldname.startsWith('variant_'))

  // Parse variants JSON if exists
  let variants = []
  if (req.body.variants) {
    try {
      variants = JSON.parse(req.body.variants)
    } catch (err) {
      try {
        variants = JSON.parse(req.body.variants.replace(/'/g, '"'))
      } catch {
        throw new AppError(
          'Invalid JSON format for variants',
          StatusCodes.BAD_REQUEST
        )
      }
    }
  }

  // Map variant images to their respective variants (optional)
  variants = variants.map((variant: IVariant, index: number) => {
    const fieldName = `variant_${index}`
    const file = variantImages.find((img) => img.fieldname === fieldName)
    return {
      ...variant,
      image: file ?? null, // attach image file if exists
    }
  })

  const payload = { ...req.body, variants }
  const result = await productService.addProduct(payload as IProduct, files)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Product created successfully',
    data: result,
  })
})

const getAllProducts = catchAsync(async (req, res) => {
  const result = await productService.getAllProducts(req.query)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Products fetched successfully',
    data: result,
  })
})

const getSingleProduct = catchAsync(async (req, res) => {
  const { productId } = req.params
  const result = await productService.getSingleProduct(productId)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Product fetched successfully',
    data: result,
  })
})

const updateProduct = catchAsync(async (req, res) => {
  const { productId } = req.params
  const files = req.files as Express.Multer.File[] // since we're using upload.any()

  // Separate main product images and variant images
  const mainImages = files.filter((file) => file.fieldname === 'image')
  const variantImages = files.filter((file) =>
    file.fieldname.startsWith('variant_')
  )

  // Parse variants JSON if provided
  let variants = []
  if (req.body.variants) {
    try {
      variants = JSON.parse(req.body.variants)
    } catch (err) {
      try {
        variants = JSON.parse(req.body.variants.replace(/'/g, '"'))
      } catch {
        throw new AppError(
          'Invalid JSON format for variants',
          StatusCodes.BAD_REQUEST
        )
      }
    }
  }

  // Map variant images to variants based on index (e.g., variant_0 → variants[0])
  variants = variants.map((variant: IVariant, index: number) => {
    const fieldName = `variant_${index}`
    const file = variantImages.find((img) => img.fieldname === fieldName)
    return {
      ...variant,
      image: file ?? variant.image ?? null, // keep existing image if not replaced
    }
  })

  const payload = { ...req.body, variants }

  const result = await productService.updateProduct(payload, productId, files)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Product updated successfully',
    data: result,
  })
})

const deleteProduct = catchAsync(async (req, res) => {
  const { productId } = req.params
  await productService.deleteProduct(productId)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Product deleted successfully',
  })
})

export const productController = {
  addProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
}
