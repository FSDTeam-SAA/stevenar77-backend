import { Router } from "express";
import {
  createClass,
  updateClass,
  getAllClasses,
  deleteClass,
  getClassById,
} from "./class.controller";
import { upload } from "../../middleware/multer.middleware";

const router = Router();

router.post("/", upload.single("image"), createClass);
router.put("/:id", updateClass);
router.get("/", getAllClasses);
router.delete("/:id", deleteClass);
router.get("/:id", getClassById);

export default router;
