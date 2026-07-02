import { Router } from "express";
import { cancelScan, createScan } from "../controllers/scan.controller.js";

const router = Router();

router.post("/", createScan);
router.delete("/:scanId", cancelScan);

export default router;
