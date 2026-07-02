import tls from "node:tls";

export function tlsModule(target, { signal } = {}) {
  if (target.protocol !== "https:") return { enabled: false, reason: "target is not https" };

  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: target.hostname,
        port: 443,
        servername: target.hostname,
        timeout: 10000
      },
      () => {
        const cert = socket.getPeerCertificate();
        const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
        const subjectAltNames = parseSubjectAltNames(cert.subjectaltname);
        resolve({
          enabled: true,
          protocol: socket.getProtocol(),
          cipher: socket.getCipher(),
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          daysRemaining: validTo ? Math.ceil((validTo.getTime() - Date.now()) / 86400000) : null,
          subjectAltNames,
          fingerprint256: cert.fingerprint256
        });
        socket.end();
      }
    );
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("TLS connection timed out"));
    });
    socket.on("error", reject);
    signal?.addEventListener(
      "abort",
      () => {
        socket.destroy();
        reject(new Error("Scan stopped"));
      },
      { once: true }
    );
  });
}

function parseSubjectAltNames(value = "") {
  return value
    .split(",")
    .map((item) => item.trim().replace(/^DNS:/, ""))
    .filter(Boolean)
    .slice(0, 80);
}
