import { Router } from "express";
import { getJsonReport } from "../controllers/report.controller.js";

const router = Router();

router.get("/:scanId/json", getJsonReport);

export default router;
