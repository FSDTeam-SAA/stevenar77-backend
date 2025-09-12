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

router.post("/", upload.array("image", 5), createClass);
router.get("/", getAllClasses);
router.get("/:id", getClassById);
router.put("/update/:id", updateClass);
router.delete("/delete/:id", deleteClass);

const classRouter = router;
export default classRouter;
