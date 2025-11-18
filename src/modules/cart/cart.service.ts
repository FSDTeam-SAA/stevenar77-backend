import { StatusCodes } from 'http-status-codes'
import AppError from '../../errors/AppError'
import { ICart } from './cart.interface'
import { Cart } from './cart.model'

const createCartItem = async (payload: ICart) => {
  const result = await Cart.create(payload)
  return result
}

const getPendingByUser = async (userId: string) => {
  const result = await Cart.find({ userId, status: 'pending' }).sort({
    createdAt: -1,
  })
  return result
}

const deleteCartItem = async (cartId: string) => {
  const cart = await Cart.findById(cartId)
  if (!cart) {
    throw new AppError('Cart item not found', StatusCodes.NOT_FOUND)
  }

  await Cart.findByIdAndDelete(cartId)
  return true
}

const cartService = {
  createCartItem,
  getPendingByUser,
  deleteCartItem,
}

export default cartService
