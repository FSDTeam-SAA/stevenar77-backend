import { Router } from "express";
import courseController from "./course.controller";
import { upload } from "../../middleware/multer.middleware";

const router = Router();

router.post("/create", upload.array("image", 5), courseController.createCourse);

const courseRouter = router;
export default courseRouter;
