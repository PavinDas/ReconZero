import { randomUUID } from "node:crypto";
import { runScan } from "../services/scan.service.js";
import { normalizeTarget } from "../helpers/url.helper.js";

export async function createScan(req, res, next) {
  try {
    const target = normalizeTarget(req.body.target);
    const id = randomUUID();
    res.status(202).json({ id, target: target.href, status: "running" });
    setTimeout(() => runScan({ id, target, io: req.app.get("io") }), 250);
  } catch (error) {
    next(error);
  }
}
