import dns from "node:dns/promises";

export async function dnsModule(target) {
  const hostname = target.hostname;
  const [a, aaaa, cname, mx, ns, txt, soa, caa] = await Promise.allSettled([
    dns.resolve4(hostname),
    dns.resolve6(hostname),
    dns.resolveCname(hostname),
    dns.resolveMx(hostname),
    dns.resolveNs(hostname),
    dns.resolveTxt(hostname),
    dns.resolveSoa(hostname),
    dns.resolveCaa(hostname)
  ]);

  return {
    hostname,
    a: value(a),
    aaaa: value(aaaa),
    cname: value(cname),
    mx: value(mx),
    ns: value(ns),
    txt: value(txt),
    soa: value(soa, null),
    caa: value(caa)
  };
}

function value(result, fallback = []) {
  return result.status === "fulfilled" ? result.value : fallback;
}
