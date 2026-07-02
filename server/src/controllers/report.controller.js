import { getReport } from "../services/report.service.js";

export function getJsonReport(req, res, next) {
  try {
    const report = getReport(req.params.scanId);
    if (!report) return res.status(404).json({ message: "Report not found" });
    return res.download(report.path, `reconx-${req.params.scanId}.json`);
  } catch (error) {
    return next(error);
  }
}
