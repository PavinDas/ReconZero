import * as cheerio from "cheerio";
import { timedRequest } from "../helpers/http.helper.js";

export async function crawlerModule(target) {
  const { response } = await timedRequest({ method: "GET", url: target.href });
  const html = typeof response.data === "string" ? response.data : String(response.data || "");
  const $ = cheerio.load(html);
  const internalLinks = new Set();
  const externalLinks = new Set();
  const scripts = new Set();
  const images = new Set();
  const forms = [];

  $("a[href]").each((_index, node) => addLink(internalLinks, externalLinks, $(node).attr("href"), target));
  $("script[src]").each((_index, node) => addUrl(scripts, $(node).attr("src"), target));
  $("img[src]").each((_index, node) => addUrl(images, $(node).attr("src"), target));
  $("form").each((_index, node) => {
    forms.push({
      action: $(node).attr("action") || "",
      method: ($(node).attr("method") || "get").toUpperCase(),
      inputs: $(node)
        .find("input")
        .map((_i, input) => ({ name: $(input).attr("name") || "", type: $(input).attr("type") || "text" }))
        .get()
    });
  });

  return {
    title: $("title").first().text().trim(),
    description: $('meta[name="description"]').attr("content") || "",
    canonical: $('link[rel="canonical"]').attr("href") || "",
    language: $("html").attr("lang") || "",
    headings: {
      h1: $("h1").map((_i, node) => $(node).text().trim()).get().filter(Boolean).slice(0, 12),
      h2: $("h2").map((_i, node) => $(node).text().trim()).get().filter(Boolean).slice(0, 20)
    },
    counts: {
      internalLinks: internalLinks.size,
      externalLinks: externalLinks.size,
      scripts: scripts.size,
      images: images.size,
      forms: forms.length
    },
    internalLinks: [...internalLinks].slice(0, 80),
    externalLinks: [...externalLinks].slice(0, 80),
    scripts: [...scripts].slice(0, 40),
    images: [...images].slice(0, 40),
    forms
  };
}

function addLink(internalLinks, externalLinks, raw, target) {
  try {
    const url = new URL(raw, target.href);
    if (url.hostname === target.hostname) internalLinks.add(url.href);
    else externalLinks.add(url.href);
  } catch {
    // Ignore malformed page URLs.
  }
}

function addUrl(set, raw, target) {
  try {
    set.add(new URL(raw, target.href).href);
  } catch {
    // Ignore malformed page URLs.
  }
}
