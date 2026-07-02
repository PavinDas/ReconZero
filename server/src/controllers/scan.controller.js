import { randomUUID } from "node:crypto";
import { createScanSignal, runScan, stopScan } from "../services/scan.service.js";
import { normalizeTarget } from "../helpers/url.helper.js";

export async function createScan(req, res, next) {
  try {
    const target = normalizeTarget(req.body.target);
    const id = randomUUID();
    const signal = createScanSignal(id);
    res.status(202).json({ id, target: target.href, status: "running" });
    setTimeout(() => runScan({ id, target, io: req.app.get("io"), signal }), 250);
  } catch (error) {
    next(error);
  }
}

export function cancelScan(req, res) {
  const stopped = stopScan(req.params.scanId, req.app.get("io"));
  res.status(stopped ? 202 : 404).json({
    id: req.params.scanId,
    status: stopped ? "stopping" : "not_found"
  });
}
