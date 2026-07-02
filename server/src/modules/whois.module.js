import whoisJson from "whois-json";

export async function whoisModule(target) {
  const payload = await whoisJson(target.hostname, { follow: 3, timeout: 12000, verbose: false });
  const data = Array.isArray(payload) ? Object.assign({}, ...payload.map((item) => item.data || item)) : payload;

  return {
    domainName: data.domainName || data.domain || target.hostname,
    registrar: data.registrar || data.sponsoringRegistrar || "",
    creationDate: data.creationDate || data.createdDate || "",
    updatedDate: data.updatedDate || "",
    expirationDate: data.registryExpiryDate || data.expirationDate || data.expires || "",
    nameServers: normalize(data.nameServer || data.nameServers),
    status: normalize(data.domainStatus || data.status).slice(0, 12),
    rawKeys: Object.keys(data).slice(0, 40)
  };
}

function normalize(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : String(value).split(/\s+/).filter(Boolean);
}
