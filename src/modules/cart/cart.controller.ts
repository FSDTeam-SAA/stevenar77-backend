import catchAsync from '../../utils/catchAsync'
import sendResponse from '../../utils/sendResponse'
import cartService from './cart.service'
import { StatusCodes } from 'http-status-codes'

const createCartItem = catchAsync(async (req, res) => {
  const result = await cartService.createCartItem(req.body)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Item added to cart successfully',
    data: result,
  })
})

const getPendingByUser = catchAsync(async (req, res) => {
  const { userId } = req.params

  const result = await cartService.getPendingByUser(userId)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Pending cart items fetched successfully',
    data: result,
  })
})

const deleteCartItem = catchAsync(async (req, res) => {
  const { cartId } = req.params

  await cartService.deleteCartItem(cartId)

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Cart item deleted successfully',
  })
})

const cartController = {
  createCartItem,
  getPendingByUser,
  deleteCartItem,
}

export default cartController
