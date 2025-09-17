import { Router } from "express";
import dashboardController from "./dashboard.controller";

const router = Router();

router.get("/admin-dashboard", dashboardController.getAdminDashboardStats);

const dashboardRouter = router;
export default dashboardRouter;
