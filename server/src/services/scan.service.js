import { writeReport } from "./report.service.js";
import { dnsModule } from "../modules/dns.module.js";
import { headersModule } from "../modules/headers.module.js";
import { tlsModule } from "../modules/tls.module.js";
import { crawlerModule } from "../modules/crawler.module.js";
import { filesModule } from "../modules/files.module.js";
import { injectionModule } from "../modules/injection.module.js";
import { technologyModule } from "../modules/technology.module.js";
import { whoisModule } from "../modules/whois.module.js";

const modules = [
  ["dns", dnsModule],
  ["headers", headersModule],
  ["tls", tlsModule],
  ["crawler", crawlerModule],
  ["files", filesModule],
  ["injection", injectionModule],
  ["technology", technologyModule],
  ["whois", whoisModule]
];

const activeScans = new Map();

export function createScanSignal(id) {
  const controller = new AbortController();
  activeScans.set(id, { controller, stopped: false });
  return controller.signal;
}

export function stopScan(id, io) {
  const scan = activeScans.get(id);
  if (!scan) return false;

  scan.controller.abort();
  if (!scan.stopped) {
    scan.stopped = true;
    emit(io, id, { type: "scan:stopped", message: "scan stopped" });
  }
  return true;
}

export async function runScan({ id, io, signal, target }) {
  const startedAt = new Date().toISOString();
  const results = {};

  emit(io, id, { type: "scan:start", message: "scan started", target: target.href });

  try {
    await Promise.all(
      modules.map(async ([name, module]) => {
        if (signal?.aborted) return;

        emit(io, id, { type: "module:start", module: name, message: "running" });
        try {
          const result = await module(target, {
            emit: (payload) => emit(io, id, { type: "module:update", module: name, ...payload }),
            signal
          });
          if (signal?.aborted) return;

          results[name] = result;
          emit(io, id, { type: "module:done", module: name, message: "complete", result });
        } catch (error) {
          if (signal?.aborted || error.code === "ERR_CANCELED") return;

          const result = { error: error.message };
          results[name] = result;
          emit(io, id, { type: "module:error", module: name, message: error.message, result });
        }
      })
    );

    const completedAt = new Date().toISOString();
    if (signal?.aborted) {
      if (!activeScans.get(id)?.stopped) emit(io, id, { type: "scan:stopped", message: "scan stopped" });
      return;
    }

    const report = writeReport({ id, target: target.href, startedAt, completedAt, results });
    emit(io, id, { type: "scan:complete", message: "scan complete", report: report.publicPath });
  } finally {
    activeScans.delete(id);
  }
}

function emit(io, room, payload) {
  io.to(room).emit("scan:event", { ...payload, at: new Date().toISOString() });
}
