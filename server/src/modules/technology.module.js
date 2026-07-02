import * as cheerio from "cheerio";
import wappalyzer from "simple-wappalyzer";
import { timedRequest } from "../helpers/http.helper.js";

export async function technologyModule(target) {
  const { response } = await timedRequest({ method: "GET", url: target.href });
  const html = typeof response.data === "string" ? response.data : String(response.data || "");
  const body = html.toLowerCase();
  const $ = cheerio.load(html);
  const headers = response.headers;
  const hints = [];
  const scripts = $("script[src]").map((_i, node) => $(node).attr("src") || "").get();
  const cookies = normalizeCookies(headers["set-cookie"]);
  const meta = $("meta")
    .map((_i, node) => ({
      name: $(node).attr("name") || $(node).attr("property") || $(node).attr("http-equiv") || "",
      content: $(node).attr("content") || ""
    }))
    .get()
    .filter((item) => item.name && item.content)
    .slice(0, 40);
  const generators = meta.filter((item) => item.name.toLowerCase() === "generator").map((item) => item.content);

  addHeaderHint(hints, "server", headers.server);
  addHeaderHint(hints, "x-powered-by", headers["x-powered-by"]);
  if (body.includes("wp-content")) hints.push("wordpress");
  if (body.includes("__next")) hints.push("next.js");
  if (body.includes("nuxt")) hints.push("nuxt");
  if (body.includes("angular")) hints.push("angular");
  if (body.includes("data-reactroot") || body.includes("react")) hints.push("react");
  if (body.includes("vue")) hints.push("vue");
  if (body.includes("shopify")) hints.push("shopify");
  if (body.includes("cloudflare")) hints.push("cloudflare");
  if (scripts.some((src) => src.includes("gtag") || src.includes("google-analytics"))) hints.push("google analytics");
  if (scripts.some((src) => src.includes("jquery"))) hints.push("jquery");
  if (cookies.some((cookie) => cookie.startsWith("_ga"))) hints.push("google analytics cookie");

  const wappalyzerResult = await detectWithWappalyzer({ headers, html, url: target.href });

  return {
    hints: [...new Set([...hints, ...generators])],
    cookies,
    meta,
    generators,
    scripts: scripts.slice(0, 40),
    wappalyzer: wappalyzerResult
  };
}

function addHeaderHint(hints, name, value) {
  if (value) hints.push(`${name}: ${value}`);
}

function normalizeCookies(value) {
  const cookies = Array.isArray(value) ? value : value ? [value] : [];
  return cookies.map((cookie) => cookie.split(";")[0]).filter(Boolean).slice(0, 40);
}

async function detectWithWappalyzer({ headers, html, url }) {
  try {
    const applications = await wappalyzer({ headers, html, url });
    return {
      applications: applications.map(normalizeApplication).sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name)),
      error: ""
    };
  } catch (error) {
    return {
      applications: [],
      error: error.message
    };
  }
}

function normalizeApplication(application) {
  return {
    name: application.name,
    confidence: application.confidence || 0,
    version: application.version || "",
    website: application.website || "",
    cpe: application.cpe || "",
    categories: (application.categories || []).map((category) => category.name).filter(Boolean)
  };
}
