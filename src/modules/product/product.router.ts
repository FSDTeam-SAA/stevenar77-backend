import { Router } from 'express'

import { upload } from '../../middleware/multer.middleware'
import { productController } from './product.controller'

const router = Router()

router.post(
  '/create',
  upload.any(), 
  productController.addProduct
)
router.get('/', productController.getAllProducts)

router.get('/:productId', productController.getSingleProduct)

router.put(
  '/update/:productId',
  upload.any(), // accept any number of files dynamically
  productController.updateProduct
)

router.delete('/delete/:productId', productController.deleteProduct)

const shopRouter = router
export default shopRouter
