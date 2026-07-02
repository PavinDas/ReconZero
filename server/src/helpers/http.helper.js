import axios from "axios";

export const httpClient = axios.create({
  headers: {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": "ReconX/1.0 Local Passive Recon"
  },
  maxBodyLength: 2_000_000,
  maxContentLength: 2_000_000,
  maxRedirects: 8,
  timeout: 20000,
  validateStatus: () => true
});

export async function timedRequest(config) {
  const redirects = [];
  const started = Date.now();
  const response = await httpClient.request({
    ...config,
    signal: config.signal,
    beforeRedirect: (options) => {
      redirects.push(`${options.protocol}//${options.hostname}${options.path}`);
    }
  });

  return {
    response,
    meta: {
      finalUrl: response.request?.res?.responseUrl || config.url,
      redirects,
      responseTimeMs: Date.now() - started
    }
  };
}
