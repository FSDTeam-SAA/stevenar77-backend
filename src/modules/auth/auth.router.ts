import { Router } from "express";
import authController from "./auth.controller";
import validateRequest from "../../middleware/validateRequest";
import { authValidationSchema } from "./auth.validation";

const router = Router();

router.post(
  "/login",
  validateRequest(authValidationSchema.authValidation),
  authController.login
);

const authRouter = router;

export default authRouter;
