import { timedRequest } from "../helpers/http.helper.js";

export async function headersModule(target) {
  const { meta, response } = await timedRequest({ method: "GET", url: target.href });
  const headers = response.headers;

  return {
    status: response.status,
    finalUrl: meta.finalUrl,
    redirects: meta.redirects,
    responseTimeMs: meta.responseTimeMs,
    headers,
    securityHeaders: {
      contentSecurityPolicy: Boolean(headers["content-security-policy"]),
      strictTransportSecurity: Boolean(headers["strict-transport-security"]),
      xFrameOptions: Boolean(headers["x-frame-options"]),
      xContentTypeOptions: Boolean(headers["x-content-type-options"]),
      referrerPolicy: Boolean(headers["referrer-policy"]),
      permissionsPolicy: Boolean(headers["permissions-policy"]),
      crossOriginOpenerPolicy: Boolean(headers["cross-origin-opener-policy"])
    }
  };
}
