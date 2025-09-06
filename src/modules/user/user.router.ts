import { Router } from "express";
import userController from "./user.controller";
import validateRequest from "../../middleware/validateRequest";
import { userValidation } from "./user.validation";
import auth from "../../middleware/auth";
import { USER_ROLE } from "./user.constant";

const router = Router();

router.post(
  "/register",
  validateRequest(userValidation.userValidationSchema),
  userController.registerUser
);

router.post(
  "/verify-email",
  auth(USER_ROLE.ADMIN, USER_ROLE.USER),
  userController.verifyEmail
);

const userRouter = router;
export default userRouter;
