import { Router } from 'express'
import cartController from './cart.controller'
import auth from '../../middleware/auth'
import { USER_ROLE } from '../user/user.constant'

const router = Router()

router.post(
  '/create',
  auth(USER_ROLE.USER, USER_ROLE.ADMIN),
  cartController.createCartItem
)

router.get(
  '/pending/:userId',
  auth(USER_ROLE.USER, USER_ROLE.ADMIN),
  cartController.getPendingByUser
)

router.delete(
  '/delete/:cartId',
  auth(USER_ROLE.USER, USER_ROLE.ADMIN),
  cartController.deleteCartItem
)

// checkout from add to cart
router.post("/checkout", cartController.cartItemsPayment)


const cartRouter = router
export default cartRouter
