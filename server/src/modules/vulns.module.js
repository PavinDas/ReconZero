import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Nikto vulnerability scan module.
 * Runs nikto against the target, streams live stdout lines as progress events,
 * then parses the final JSON report for structured results.
 */
export async function vulnsModule(target, { emit, signal } = {}) {
  // Check nikto is available
  const niktoPath = await findNikto();
  if (!niktoPath) {
    return {
      status: "error",
      error: "nikto is not installed or not found in PATH. Install it with: sudo apt install nikto",
      vulnerabilities: [],
      summary: {}
    };
  }

  const outputFile = path.join(os.tmpdir(), `reconzero_nikto_${Date.now()}.json`);
  const maxTime = process.env.NIKTO_MAXTIME || "120s";
  const timeout = readPositiveInt(process.env.NIKTO_TIMEOUT_MS, 130_000);

  // Build nikto args
  const args = [
    "-h", target.href,
    "-Format", "json",
    "-output", outputFile,
    "-nointeractive",
    "-maxtime", maxTime,
    "-timeout", "10",
    "-C", "all",       // check all tests
    "-Display", "P"    // print progress to stdout
  ];

  // Force SSL if target uses https
  if (target.protocol === "https:") args.push("-ssl");

  emitProgress(emit, {
    message: `starting nikto scan against ${target.href}`,
    result: createSnapshot({ host: target.hostname, port: target.port || (target.protocol === "https:" ? "443" : "80"), vulnerabilities: [], liveLines: [], status: "running", banner: null })
  });

  const liveLines = [];
  let vulnerabilities = [];
  let banner = null;

  try {
    // Run nikto — capture stdout line-by-line for live updates
    await runNiktoWithStreaming(niktoPath, args, timeout, signal, (line) => {
      const clean = stripAnsi(line).trim();
      if (!clean) return;

      liveLines.push(clean);
      // Keep live log trimmed to last 40 lines
      if (liveLines.length > 40) liveLines.shift();

      // Detect server banner from stdout
      if (!banner && /server:/i.test(clean)) {
        const m = clean.match(/server:\s*(.+)/i);
        if (m) banner = m[1].trim();
      }

      emitProgress(emit, {
        message: clean,
        result: createSnapshot({ host: target.hostname, port: target.port || derivePort(target), vulnerabilities, liveLines: [...liveLines], status: "running", banner })
      });
    });
  } catch (err) {
    if (signal?.aborted || err.code === "ERR_CANCELED") {
      return {
        status: "stopped",
        host: target.hostname,
        vulnerabilities,
        liveLines,
        summary: buildSummary(vulnerabilities)
      };
    }
    // Nikto exits non-zero on warnings — that's okay, we still parse the file
    if (!err.message?.includes("nikto")) {
      // swallow non-fatal nikto exit codes
    }
  }

  // Parse JSON output file
  try {
    if (fs.existsSync(outputFile)) {
      const raw = fs.readFileSync(outputFile, "utf8");
      const parsed = parseNiktoJson(raw);
      vulnerabilities = parsed.vulnerabilities;
      banner = parsed.banner || banner;
    }
  } catch (parseErr) {
    // fallback: use whatever we've streamed
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(outputFile); } catch { /* ignore */ }
  }

  const grouped = groupBySeverity(vulnerabilities);

  return {
    status: "complete",
    host: target.hostname,
    port: derivePort(target),
    banner,
    liveLines,
    vulnerabilities,
    grouped,
    summary: buildSummary(vulnerabilities)
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function createSnapshot({ host, port, vulnerabilities, liveLines, status, banner }) {
  return {
    status,
    host,
    port,
    banner,
    liveLines,
    vulnerabilities,
    grouped: groupBySeverity(vulnerabilities),
    summary: buildSummary(vulnerabilities)
  };
}

function emitProgress(emit, payload) {
  if (typeof emit === "function") emit(payload);
}

async function findNikto() {
  for (const candidate of ["nikto", "/usr/bin/nikto", "/usr/local/bin/nikto"]) {
    try {
      await execFileAsync("which", [candidate.startsWith("/") ? candidate : "nikto"]);
      return candidate;
    } catch {
      if (candidate.startsWith("/") && fs.existsSync(candidate)) return candidate;
    }
  }
  return fs.existsSync("/usr/bin/nikto") ? "/usr/bin/nikto" : null;
}

async function runNiktoWithStreaming(niktoPath, args, timeout, signal, onLine) {
  return new Promise((resolve, reject) => {
    const child = execFile(niktoPath, args, { timeout, maxBuffer: 10 * 1024 * 1024 });

    if (signal) {
      signal.addEventListener("abort", () => {
        child.kill("SIGTERM");
        reject(Object.assign(new Error("scan aborted"), { code: "ERR_CANCELED" }));
      }, { once: true });
    }

    let buffer = "";
    child.stdout?.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? ""; // last incomplete line stays in buffer
      for (const line of lines) onLine(line);
    });
    child.stderr?.on("data", (chunk) => {
      const lines = chunk.toString().split(/\r?\n/);
      for (const line of lines) if (line.trim()) onLine(line);
    });

    child.on("close", (code) => {
      if (buffer.trim()) onLine(buffer);
      // nikto exits 0 or 1 — both are fine
      resolve(code);
    });
    child.on("error", reject);
  });
}

function parseNiktoJson(raw) {
  const data = JSON.parse(raw);
  // Nikto JSON is an array of host objects
  const hosts = Array.isArray(data) ? data : [data];
  const vulnerabilities = [];
  let banner = null;

  for (const host of hosts) {
    if (host.server_banner && !banner) banner = host.server_banner;
    for (const vuln of host.vulnerabilities || []) {
      vulnerabilities.push(normalizeVuln(vuln));
    }
  }

  return { vulnerabilities, banner };
}

function normalizeVuln(raw) {
  const msg = (raw.msg || raw.message || "").trim();
  return {
    id: raw.id || raw.nikto_id || null,
    method: (raw.method || "GET").toUpperCase(),
    url: raw.url || raw.uri || "",
    msg,
    references: raw.references || raw.refs || "",
    severity: classifySeverity(msg, raw.id)
  };
}

function classifySeverity(msg, id) {
  const m = msg.toLowerCase();
  if (/sql injection|xss|cross.site scripting|remote code|rce|command injection|file inclusion|directory traversal|path traversal|xxe|ssrf|deserialization|upload.*shell/i.test(msg)) return "critical";
  if (/password|credential|auth|admin|backup|config|\.env|private key|secret|token|session|cookie.*httponly|cors|csrf/i.test(msg)) return "high";
  if (/information disclosure|server.*version|php.*version|apache.*version|nginx.*version|x-powered|header.*missing|outdated|deprecated|default.*page|robots\.txt|sitemap/i.test(msg)) return "medium";
  return "info";
}

function groupBySeverity(vulnerabilities) {
  const groups = { critical: [], high: [], medium: [], info: [] };
  for (const v of vulnerabilities) {
    const key = v.severity || "info";
    (groups[key] = groups[key] || []).push(v);
  }
  return groups;
}

function buildSummary(vulnerabilities) {
  const counts = { critical: 0, high: 0, medium: 0, info: 0, total: vulnerabilities.length };
  for (const v of vulnerabilities) {
    const k = v.severity || "info";
    if (k in counts) counts[k]++;
  }
  return counts;
}

function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[mGKHF]/g, "");
}

function derivePort(target) {
  if (target.port) return target.port;
  return target.protocol === "https:" ? "443" : "80";
}

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
