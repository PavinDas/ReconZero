import dns from "node:dns/promises";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultWordlist = path.join(moduleRoot, "subdomains.txt");

export async function subdomainsModule(target, { emit, signal } = {}) {
  const wordlistPath = process.env.SUBDOMAIN_WORDLIST_PATH || defaultWordlist;
  const limit = readPositiveInt(process.env.SUBDOMAIN_WORDLIST_LIMIT, 10000);
  const concurrency = readPositiveInt(process.env.SUBDOMAIN_CONCURRENCY, 30);

  const baseDomain = extractBaseDomain(target.hostname);
  const candidates = await loadCandidates(wordlistPath, limit);

  const found = [];
  let scanned = 0;
  const total = candidates.length;

  emitProgress(emit, {
    message: `enumerating ${total} subdomain candidates for ${baseDomain}`,
    result: createSnapshot({ baseDomain, concurrency, found, limit, scanned, status: "running", total, wordlistPath })
  });

  await mapPool(candidates, concurrency, signal, async (candidate) => {
    scanned += 1;
    const subdomain = `${candidate}.${baseDomain}`;
    const hit = await resolveSubdomain(subdomain, signal);

    if (!hit) {
      emitScannedProgress(emit, { baseDomain, concurrency, found, limit, scanned, total, wordlistPath });
      return;
    }

    found.push(hit);
    emitHitProgress(emit, { baseDomain, concurrency, found, hit, limit, scanned, total, wordlistPath });
  });

  found.sort((a, b) => a.subdomain.localeCompare(b.subdomain));

  return {
    wordlistPath,
    baseDomain,
    scanned,
    total,
    limit,
    concurrency,
    status: "complete",
    found,
    ipSet: [...new Set(found.flatMap((h) => h.addresses))]
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function createSnapshot({ baseDomain, concurrency, found, limit, scanned, status, total, wordlistPath }) {
  return {
    wordlistPath,
    baseDomain,
    scanned,
    total,
    limit,
    concurrency,
    status,
    found,
    ipSet: [...new Set(found.flatMap((h) => h.addresses))]
  };
}

function emitHitProgress(emit, { baseDomain, concurrency, found, hit, limit, scanned, total, wordlistPath }) {
  emitProgress(emit, {
    message: `found ${hit.subdomain}`,
    result: {
      ...createSnapshot({ baseDomain, concurrency, found: [hit], limit, scanned, status: "running", total, wordlistPath }),
      append: true
    }
  });
}

function emitScannedProgress(emit, { baseDomain, concurrency, found, limit, scanned, total, wordlistPath }) {
  if (scanned % 50 !== 0 && scanned !== total) return;
  emitProgress(emit, {
    message: `scanned ${scanned}/${total}`,
    result: createSnapshot({ baseDomain, concurrency, found: [], limit, scanned, status: "running", total, wordlistPath })
  });
}

function emitProgress(emit, payload) {
  if (typeof emit === "function") emit(payload);
}

async function loadCandidates(wordlistPath, limit) {
  if (!fs.existsSync(wordlistPath)) return [];

  const candidates = [];
  const seen = new Set();
  const stream = fs.createReadStream(wordlistPath, { encoding: "utf8" });
  const reader = readline.createInterface({ crlfDelay: Infinity, input: stream });

  for await (const line of reader) {
    const candidate = line.trim().toLowerCase().replace(/\.$/, "");
    if (!candidate || candidate.startsWith("#") || seen.has(candidate)) continue;

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

async function resolveSubdomain(subdomain, signal) {
  if (signal?.aborted) return null;
  try {
    const addresses = await dns.resolve4(subdomain);
    let cname = null;
    try {
      const cnames = await dns.resolveCname(subdomain);
      cname = cnames[0] || null;
    } catch {
      // CNAME lookup is best-effort
    }
    return { subdomain, addresses, cname };
  } catch {
    return null;
  }
}

async function mapPool(items, concurrency, signal, worker) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length || 1) }, async () => {
    while (cursor < items.length && !signal?.aborted) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  });

  await Promise.all(workers);
}

function extractBaseDomain(hostname) {
  // Strip leading "www." if present
  return hostname.replace(/^www\./, "");
}

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
