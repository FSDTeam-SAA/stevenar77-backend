import { Router } from "express";

import { upload } from "../../middleware/multer.middleware";
import { productController } from "./product.controller";

const router = Router();

router.post("/create", upload.array("image", 5), productController.addProduct);
router.get("/", productController.getAllProducts);

router.get("/:productId", productController.getSingleProduct);

router.put(
  "/update/:productId",
  upload.array("image", 5),
  productController.updateProduct
);

router.delete("/delete/:productId", productController.deleteProduct);

const productRouter = router;
export default productRouter;
