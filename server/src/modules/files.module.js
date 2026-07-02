import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { timedRequest } from "../helpers/http.helper.js";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultWordlist = path.join(moduleRoot, "common.txt");
const commonExtensions = [
  ".html",
  ".htm",
  ".js",
  ".jsx",
  ".php",
  ".txt",
  ".json",
  ".xml",
  ".css",
  ".env",
  ".config",
  ".bak",
  ".old",
  ".zip",
  ".tar",
  ".gz",
  ".asp",
  ".aspx",
  ".jsp"
];
const fallbackPaths = [
  "robots.txt",
  "sitemap.xml",
  "security.txt",
  ".well-known/security.txt",
  "humans.txt",
  "manifest.json",
  ".well-known/change-password",
  "favicon.ico"
];

export async function filesModule(target, { emit, signal } = {}) {
  const wordlistPath = process.env.FILE_WORDLIST_PATH || defaultWordlist;
  const limit = readPositiveInt(process.env.FILE_WORDLIST_LIMIT, 5000);
  const directoryLimit = readPositiveInt(process.env.FILE_DIRECTORY_SCAN_LIMIT, 100);
  const concurrency = readPositiveInt(process.env.FILE_SCAN_CONCURRENCY, 12);
  const timeout = readPositiveInt(process.env.FILE_SCAN_TIMEOUT_MS, 5000);
  const names = await loadCandidates(wordlistPath, limit);
  const candidates = expandCandidates(names);
  const matches = [];
  const directories = [];
  const seenPaths = new Set();
  let scanned = 0;
  let total = candidates.length;

  emitProgress(emit, {
    message: `scanning ${total} file candidates`,
    result: createSnapshot({ concurrency, directoryLimit, limit, matches, scanned, status: "running", total, wordlistPath })
  });

  await mapPool(candidates, concurrency, signal, async (candidate) => {
    scanned += 1;
    const match = await probePath(candidate, target, timeout, seenPaths, signal);
    if (!match) {
      emitScannedProgress(emit, { concurrency, directoryLimit, limit, matches, scanned, total, wordlistPath });
      return;
    }

    matches.push(match);
    if (match.kind === "directory") directories.push(match.path);
    emitMatchProgress(emit, { concurrency, directoryLimit, limit, match, matches, scanned, total, wordlistPath });
  });

  const directoryCandidates = expandDirectoryCandidates(directories, names, directoryLimit);
  total += directoryCandidates.length;
  if (directoryCandidates.length > 0) {
    emitProgress(emit, {
      message: `searching inside ${directories.length} directories`,
      result: createSnapshot({ concurrency, directoryLimit, limit, matches, scanned, status: "running", total, wordlistPath })
    });
  }

  await mapPool(directoryCandidates, concurrency, signal, async (candidate) => {
    scanned += 1;
    const match = await probePath(candidate, target, timeout, seenPaths, signal);
    if (!match) {
      emitScannedProgress(emit, { concurrency, directoryLimit, limit, matches, scanned, total, wordlistPath });
      return;
    }

    matches.push(match);
    emitMatchProgress(emit, { concurrency, directoryLimit, limit, match, matches, scanned, total, wordlistPath });
  });

  matches.sort((a, b) => a.status - b.status || a.path.localeCompare(b.path));

  return {
    wordlistPath,
    scanned,
    total,
    limit,
    directoryLimit,
    concurrency,
    status: "complete",
    matches,
    findings: matches.flatMap((item) => item.directives || []).slice(0, 80)
  };
}

function createSnapshot({ concurrency, directoryLimit, limit, matches, scanned, status, total, wordlistPath }) {
  return {
    wordlistPath,
    scanned,
    total,
    limit,
    directoryLimit,
    concurrency,
    status,
    matches,
    findings: matches.flatMap((item) => item.directives || []).slice(0, 80)
  };
}

function emitMatchProgress(emit, { concurrency, directoryLimit, limit, match, matches, scanned, total, wordlistPath }) {
  emitProgress(emit, {
    message: `found ${match.path}`,
    result: {
      ...createSnapshot({ concurrency, directoryLimit, limit, matches: [match], scanned, status: "running", total, wordlistPath }),
      append: true
    }
  });
}

function emitScannedProgress(emit, { concurrency, directoryLimit, limit, matches, scanned, total, wordlistPath }) {
  if (scanned % 25 !== 0 && scanned !== total) return;
  emitProgress(emit, {
    message: `scanned ${scanned}/${total}`,
    result: createSnapshot({ concurrency, directoryLimit, limit, matches: [], scanned, status: "running", total, wordlistPath })
  });
}

function emitProgress(emit, payload) {
  if (typeof emit === "function") emit(payload);
}

async function loadCandidates(wordlistPath, limit) {
  if (!fs.existsSync(wordlistPath)) return fallbackPaths.slice(0, limit);

  const candidates = [];
  const seen = new Set();
  const stream = fs.createReadStream(wordlistPath, { encoding: "utf8" });
  const reader = readline.createInterface({ crlfDelay: Infinity, input: stream });

  for await (const line of reader) {
    const candidate = line.trim();
    if (!candidate || seen.has(candidate)) continue;

    seen.add(candidate);
    candidates.push(candidate);
    if (candidates.length >= limit) {
      reader.close();
      stream.destroy();
      break;
    }
  }

  return candidates;
}

function expandCandidates(candidates) {
  const expanded = [];
  const seen = new Set();

  for (const candidate of candidates) {
    for (const pathCandidate of variantsFor(candidate)) {
      if (seen.has(pathCandidate)) continue;
      seen.add(pathCandidate);
      expanded.push(pathCandidate);
    }
  }

  return expanded;
}

function expandDirectoryCandidates(directories, candidates, limit) {
  const expanded = [];
  const seen = new Set();
  const names = candidates.slice(0, limit);

  for (const directory of directories) {
    const base = directory.replace(/^\/+|\/+$/g, "");
    if (!base) continue;

    for (const candidate of names) {
      for (const pathCandidate of fileVariantsFor(`${base}/${candidate}`)) {
        if (seen.has(pathCandidate)) continue;
        seen.add(pathCandidate);
        expanded.push(pathCandidate);
      }
    }
  }

  return expanded;
}

function variantsFor(candidate) {
  const clean = candidate.replace(/^\/+/, "").trim();
  if (!clean || clean.includes("\0")) return [];

  const variants = [...fileVariantsFor(clean)];
  if (!hasExtension(clean) && !clean.endsWith("/")) variants.push(`${clean}/`);
  return variants;
}

function fileVariantsFor(candidate) {
  const clean = candidate.replace(/^\/+/, "").trim();
  if (!clean || clean.includes("\0") || clean.endsWith("/")) return [];
  if (hasExtension(clean)) return [clean];
  return [clean, ...commonExtensions.map((extension) => `${clean}${extension}`)];
}

async function mapPool(items, concurrency, signal, worker) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length && !signal?.aborted) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  });

  await Promise.all(workers);
}

async function probePath(candidate, target, timeout, seenPaths, signal) {
  if (signal?.aborted) return null;
  const filePath = normalizePath(candidate);
  if (!filePath || seenPaths.has(filePath)) return null;
  seenPaths.add(filePath);

  const url = new URL(filePath, target.origin).href;
  try {
    const { response, meta } = await timedRequest({ method: "GET", signal, timeout, url });
    if (isFourHundred(response.status)) return null;

    const body = typeof response.data === "string" ? response.data : "";
    const contentType = response.headers["content-type"] || "";
    const kind = isDirectoryPath(filePath, meta.finalUrl) ? "directory" : "file";
    return {
      path: filePath,
      url,
      kind,
      status: response.status,
      finalUrl: meta.finalUrl,
      contentType,
      size: body.length,
      responseTimeMs: meta.responseTimeMs,
      directives: extractDirectives(filePath, body)
    };
  } catch {
    // Keep output useful: network errors and timeouts are not displayed as discovered paths.
    return null;
  }
}

function normalizePath(candidate) {
  const clean = candidate.replace(/^\/+/, "").trim();
  if (!clean || clean.includes("\0")) return "";
  return `/${clean
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function isFourHundred(status) {
  return status >= 400 && status < 500;
}

function hasExtension(candidate) {
  const basename = candidate.replace(/\/+$/, "").split("/").pop() || "";
  return /\.[a-z0-9]{1,8}$/i.test(basename);
}

function isDirectoryPath(filePath, finalUrl) {
  if (filePath.endsWith("/")) return true;
  try {
    return new URL(finalUrl).pathname.endsWith("/");
  } catch {
    return false;
  }
}

function extractDirectives(filePath, body) {
  if (!body) return [];
  if (filePath.endsWith("robots.txt")) {
    return body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^(disallow|allow|sitemap):/i.test(line))
      .slice(0, 30);
  }
  if (filePath.includes("security.txt")) {
    return body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^(contact|policy|expires|preferred-languages):/i.test(line))
      .slice(0, 20);
  }
  return [];
}

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
