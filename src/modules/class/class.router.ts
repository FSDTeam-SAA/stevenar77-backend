import { Router } from 'express'
import {
  createClass,
  updateClass,
  getAllClasses,
  deleteClass,
  getClassById,
} from './class.controller'


const router = Router()

router.post('/', createClass)
router.put('/:id', updateClass)
router.get('/', getAllClasses)
router.delete('/:id', deleteClass)
router.get('/:id', getClassById)

export default router
