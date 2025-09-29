import { Router } from 'express'
import {
  createSocialProfile,
  getAllSocialProfiles,
  getSocialProfileById,
  updateSocialProfile,
  deleteSocialProfile,
} from './social.controller'

const router = Router()

router.post('/', createSocialProfile)
router.get('/', getAllSocialProfiles)
router.get('/:id', getSocialProfileById)
router.put('/:id', updateSocialProfile) 
router.delete('/:id', deleteSocialProfile)

const socialRouter = router
export default socialRouter
