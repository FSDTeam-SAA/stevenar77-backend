import { Router } from "express";
import {
  createClass,
  updateClass,
  getAllClasses,
  deleteClass,
  getClassById,
  toggleCourseStatus,
} from "./class.controller";
import { upload } from "../../middleware/multer.middleware";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constant";

const router = Router();

router.post("/", upload.single("image"), createClass);
router.get("/", getAllClasses);
router.get("/:id", getClassById);
router.put("/update/:id", upload.single("image"), updateClass);
router.put("/update-status/:id", auth(USER_ROLE.ADMIN), toggleCourseStatus);
router.delete("/delete/:id", deleteClass);

const classRouter = router;
export default classRouter;
