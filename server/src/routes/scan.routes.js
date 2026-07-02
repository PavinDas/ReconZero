import { Router } from "express";
import { createScan } from "../controllers/scan.controller.js";

const router = Router();

router.post("/", createScan);

export default router;
