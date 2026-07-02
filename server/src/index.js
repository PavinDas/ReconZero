import "dotenv/config";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import http from "node:http";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import scanRoutes from "./routes/scan.routes.js";
import reportRoutes from "./routes/report.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" } });

app.set("io", io);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ limit: 90, windowMs: 15 * 60 * 1000 }));

io.on("connection", (socket) => {
  socket.on("scan:join", (scanId) => socket.join(scanId));
});

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "reconzero" }));
app.use("/api/scans", scanRoutes);
app.use("/api/reports", reportRoutes);
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
server.listen(port, () => {
  console.log(`ReconZero API listening on http://localhost:${port}`);
});
