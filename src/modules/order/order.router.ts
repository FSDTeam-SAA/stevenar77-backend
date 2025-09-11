import { Router } from "express";
import orderController from "./order.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constant";

const router = Router();

router.post("/create", auth(USER_ROLE.USER), orderController.createOrder);

router.get("/my-order", auth(USER_ROLE.USER), orderController.getMyOder);

router.get("/all-order", auth(USER_ROLE.ADMIN), orderController.getAllOrder);
router.put(
  "/cancel-order/:orderId",
  auth(USER_ROLE.USER),
  orderController.orderCancelByUser
);

const orderRouter = router;
export default orderRouter;
