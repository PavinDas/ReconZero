import axios from "axios";

export async function startScan(target) {
  const { data } = await axios.post("/api/scans", { target });
  return data;
}
