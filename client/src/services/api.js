import axios from "axios";

export async function startScan(target) {
  const { data } = await axios.post("/api/scans", { target });
  return data;
}

export async function stopScan(scanId) {
  const { data } = await axios.delete(`/api/scans/${scanId}`);
  return data;
}
