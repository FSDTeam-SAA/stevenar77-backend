import { Router } from "express";
import courseController from "./course.controller";
import { upload } from "../../middleware/multer.middleware";

const router = Router();

router.post("/create", upload.array("image", 5), courseController.createCourse);
router.get("/", courseController.getAllCourses);

router.get("/:courseId", courseController.getSingleCourse);

const courseRouter = router;
export default courseRouter;
