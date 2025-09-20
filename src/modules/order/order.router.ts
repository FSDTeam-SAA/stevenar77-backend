import { Router } from "express";
import orderController from "./order.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constant";
import { upload } from "../../middleware/multer.middleware";

const router = Router();

router.post("/create", auth(USER_ROLE.USER), upload.array("image", 5),orderController.createOrder);

router.get("/my-order", auth(USER_ROLE.USER), orderController.getMyOder);

router.get("/all-order", auth(USER_ROLE.ADMIN), orderController.getAllOrder);
router.put(
  "/cancel-order/:orderId",
  auth(USER_ROLE.USER),
  orderController.orderCancelByUser
);

router.put(
  "/update-status/:orderId",
//   auth(USER_ROLE.ADMIN),
  orderController.updateOrderStatus
);

const orderRouter = router;
export default orderRouter;
