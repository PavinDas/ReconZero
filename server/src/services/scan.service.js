import { writeReport } from "./report.service.js";
import { dnsModule } from "../modules/dns.module.js";
import { headersModule } from "../modules/headers.module.js";
import { tlsModule } from "../modules/tls.module.js";
import { crawlerModule } from "../modules/crawler.module.js";
import { filesModule } from "../modules/files.module.js";
import { technologyModule } from "../modules/technology.module.js";
import { whoisModule } from "../modules/whois.module.js";

const modules = [
  ["dns", dnsModule],
  ["headers", headersModule],
  ["tls", tlsModule],
  ["crawler", crawlerModule],
  ["files", filesModule],
  ["technology", technologyModule],
  ["whois", whoisModule]
];

export async function runScan({ id, io, target }) {
  const startedAt = new Date().toISOString();
  const results = {};

  emit(io, id, { type: "scan:start", message: "scan started", target: target.href });

  await Promise.all(
    modules.map(async ([name, module]) => {
      emit(io, id, { type: "module:start", module: name, message: "running" });
      try {
        const result = await module(target, {
          emit: (payload) => emit(io, id, { type: "module:update", module: name, ...payload })
        });
        results[name] = result;
        emit(io, id, { type: "module:done", module: name, message: "complete", result });
      } catch (error) {
        const result = { error: error.message };
        results[name] = result;
        emit(io, id, { type: "module:error", module: name, message: error.message, result });
      }
    })
  );

  const completedAt = new Date().toISOString();
  const report = writeReport({ id, target: target.href, startedAt, completedAt, results });
  emit(io, id, { type: "scan:complete", message: "scan complete", report: report.publicPath });
}

function emit(io, room, payload) {
  io.to(room).emit("scan:event", { ...payload, at: new Date().toISOString() });
}
