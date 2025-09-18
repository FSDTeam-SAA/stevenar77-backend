import { Router } from "express";
import { createDraftOrderController, fetchProduct, getOrderQuote, getProducts, submitDraftOrderController } from "./shop.controller";

import auth from "../../middleware/auth";



const router = Router();

router.post("/create-order",auth("user"),createDraftOrderController)
router.get("/", getProducts);
router.get("/get-price/:productUid",fetchProduct)
router.get("/get-qoute",getOrderQuote)
router.patch("/order", submitDraftOrderController)


const productRouter = router;
export default productRouter;