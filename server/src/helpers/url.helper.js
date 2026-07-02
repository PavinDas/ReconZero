export function normalizeTarget(raw) {
  if (!raw || typeof raw !== "string") {
    const error = new Error("Target URL is required");
    error.status = 400;
    throw error;
  }

  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    const error = new Error("Enter a valid absolute URL, for example https://example.com");
    error.status = 400;
    throw error;
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    const error = new Error("Only http and https targets are supported");
    error.status = 400;
    throw error;
  }

  return url;
}
