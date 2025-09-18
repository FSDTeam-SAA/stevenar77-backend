import { Router } from "express";
import { createDraftOrderController, fetchProduct, getByIdController, getGelatoOrder, getOrderQuote, getProducts, submitDraftOrderController } from "./shop.controller";

import auth from "../../middleware/auth";



const router = Router();

router.post("/create-order",auth("user"),createDraftOrderController)
router.get("/", getProducts);
router.get("/get-price/:productUid",fetchProduct)
router.get("/get-qoute",getOrderQuote)
router.get("/get",auth("user"),getByIdController)
router.get("/get/:orderId",getGelatoOrder)
router.patch("/order", submitDraftOrderController)


const productRouter = router;
export default productRouter;