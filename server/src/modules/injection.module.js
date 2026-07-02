import * as cheerio from "cheerio";
import { timedRequest } from "../helpers/http.helper.js";

export async function injectionModule(target) {
  const { response } = await timedRequest({ method: "GET", url: target.href });
  const html = typeof response.data === "string" ? response.data : String(response.data || "");
  const $ = cheerio.load(html);
  const endpoints = [];
  const seen = new Set();

  addUrlEndpoint(endpoints, seen, target.href, target, "target");

  $("a[href]").each((_index, node) => {
    addUrlEndpoint(endpoints, seen, $(node).attr("href"), target, "link");
  });

  $("form").each((index, node) => {
    const form = $(node);
    const method = (form.attr("method") || "get").toUpperCase();
    const url = resolveUrl(form.attr("action") || target.href, target);
    if (!url || url.hostname !== target.hostname) return;

    const parameters = form
      .find("input[name], textarea[name], select[name], button[name]")
      .map((_i, input) => $(input).attr("name") || "")
      .get()
      .filter(Boolean);

    if (parameters.length === 0) return;
    addEndpoint(endpoints, seen, {
      type: "form",
      method,
      url: url.href,
      path: formatPath(url),
      parameters: unique(parameters),
      source: `form #${index + 1}`
    });
  });

  $("script:not([src])").each((_index, node) => {
    for (const raw of extractScriptUrls($(node).html() || "")) {
      addUrlEndpoint(endpoints, seen, raw, target, "script");
    }
  });

  endpoints.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

  return {
    scanned: {
      links: $("a[href]").length,
      forms: $("form").length,
      inlineScripts: $("script:not([src])").length
    },
    endpoints,
    parameterCount: endpoints.reduce((sum, item) => sum + item.parameters.length, 0)
  };
}

function addUrlEndpoint(endpoints, seen, raw, target, source) {
  const url = resolveUrl(raw, target);
  const parameters = url ? unique([...url.searchParams.keys()]) : [];
  if (!url || url.hostname !== target.hostname || parameters.length === 0) return;

  addEndpoint(endpoints, seen, {
    type: "query",
    method: "GET",
    url: url.href,
    path: formatPath(url),
    parameters,
    source
  });
}

function addEndpoint(endpoints, seen, endpoint) {
  const key = `${endpoint.method}:${endpoint.url}:${endpoint.parameters.join(",")}`;
  if (seen.has(key)) return;
  seen.add(key);
  endpoints.push(endpoint);
}

function resolveUrl(raw, target) {
  try {
    return new URL(raw, target.href);
  } catch {
    return null;
  }
}

function formatPath(url) {
  return `${url.pathname}${url.search}`;
}

function unique(values) {
  return [...new Set(values)];
}

function extractScriptUrls(script) {
  const matches = script.matchAll(/["'`](\/[^"'`\s<>]+?\?[^"'`\s<>]+|https?:\/\/[^"'`\s<>]+?\?[^"'`\s<>]+)["'`]/g);
  return [...matches].map((match) => match[1]);
}
