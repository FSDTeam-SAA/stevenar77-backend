import { Router } from "express";
import orderController from "./order.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constant";

const router = Router();

router.post("/create", auth(USER_ROLE.USER), orderController.createOrder);

router.get("/my-order", auth(USER_ROLE.USER), orderController.getMyOder);

const orderRouter = router;
export default orderRouter;
