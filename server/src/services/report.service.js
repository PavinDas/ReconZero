import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../reports");
const reports = new Map();

export function writeReport(report) {
  fs.mkdirSync(root, { recursive: true });
  const filePath = path.join(root, `${report.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  const record = { path: filePath, publicPath: `/api/reports/${report.id}/json` };
  reports.set(report.id, record);
  return record;
}

export function getReport(scanId) {
  if (reports.has(scanId)) return reports.get(scanId);
  const filePath = path.join(root, `${scanId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return { path: filePath, publicPath: `/api/reports/${scanId}/json` };
}
