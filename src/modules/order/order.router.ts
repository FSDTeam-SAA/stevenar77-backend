import { Router } from "express";
import auth from "../../middleware/auth";
import { upload } from "../../middleware/multer.middleware";
import { USER_ROLE } from "../user/user.constant";
import orderController from "./order.controller";

const router = Router();

router.post(
  "/create",
  auth(USER_ROLE.USER, USER_ROLE.ADMIN),
  upload.array("image", 5),
  orderController.createOrder
);

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

router.get("/paid", orderController.fetchPaidOrders);

router.delete(
  "/deleted-order",
  // auth(USER_ROLE.ADMIN),
  orderController.deleteAllOrderClass
);

const orderRouter = router;
export default orderRouter;
