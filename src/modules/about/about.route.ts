import { Router } from 'express'
import {
  createAbout,
  getAllAbout,
  getAboutById,
  updateAbout,
  deleteAbout,
} from './about.controller'
import { upload } from '../../middleware/multer.middleware'

const router = Router()

router.post(
  '/',
  upload.fields([
    { name: 'section1Images', maxCount: 10 },
    { name: 'section2Images', maxCount: 10 },
    { name: 'section3Images', maxCount: 10 },
    { name: 'galleryImages', maxCount: 20 },
    { name: 'teamImages', maxCount: 10 },
  ]),
  createAbout
)

router.get('/', getAllAbout)
router.get('/:id', getAboutById)

router.put(
  '/:id',
  upload.fields([
    { name: 'section1Images', maxCount: 10 },
    { name: 'section2Images', maxCount: 10 },
    { name: 'section3Images', maxCount: 10 },
    { name: 'galleryImages', maxCount: 20 },
    { name: 'teamImages', maxCount: 10 },
  ]),
  updateAbout
)

router.delete('/:id', deleteAbout)

export default router
