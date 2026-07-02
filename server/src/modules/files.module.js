import { timedRequest } from "../helpers/http.helper.js";

const paths = [
  "/robots.txt",
  "/sitemap.xml",
  "/security.txt",
  "/.well-known/security.txt",
  "/humans.txt",
  "/manifest.json",
  "/.well-known/change-password",
  "/favicon.ico"
];

export async function filesModule(target) {
  const checks = await Promise.all(
    paths.map(async (filePath) => {
      const url = new URL(filePath, target.origin).href;
      try {
        const { response, meta } = await timedRequest({ method: "GET", url });
        const body = typeof response.data === "string" ? response.data : "";
        return {
          path: filePath,
          status: response.status,
          finalUrl: meta.finalUrl,
          contentType: response.headers["content-type"] || "",
          size: body.length,
          preview: body.slice(0, 800),
          directives: extractDirectives(filePath, body)
        };
      } catch (error) {
        return { path: filePath, error: error.message };
      }
    })
  );
  return { checks, findings: checks.flatMap((item) => item.directives || []).slice(0, 80) };
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
