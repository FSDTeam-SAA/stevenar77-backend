import { Router } from "express";
import dashboardController from "./dashboard.controller";

const router = Router();

router.get("/admin-dashboard", dashboardController.getAdminDashboardStats);

router.get("/chart-data", dashboardController.getChartData);

const dashboardRouter = router;
export default dashboardRouter;
