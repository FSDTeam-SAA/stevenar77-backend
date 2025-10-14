import { Router } from 'express'

import { upload } from '../../middleware/multer.middleware'
import { productController } from './product.controller'

const router = Router()

router.post(
  '/create',
  upload.any(), // accept any number of files with any field names
  productController.addProduct
)
router.get('/', productController.getAllProducts)

router.get('/:productId', productController.getSingleProduct)

router.put(
  '/update/:productId',
  upload.fields([
    { name: 'image', maxCount: 5 }, // main product images
    { name: 'variant_0', maxCount: 1 }, // variant 0 image
    { name: 'variant_1', maxCount: 1 }, // variant 1 image
    { name: 'variant_2', maxCount: 1 }, // add more dynamically as needed
  ]),
  productController.updateProduct
)


router.delete('/delete/:productId', productController.deleteProduct)

const shopRouter = router
export default shopRouter
