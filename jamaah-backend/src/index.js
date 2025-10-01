import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import http from "http";
import { initRealtime } from "./realtime/socket.js";

import rooms from "./routes/rooms.js";
import playback from "./routes/playback.js";
import prayer from "./routes/prayer.js";
import quran from "./routes/quran.js";
import alerts from "./routes/alerts.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.get("/", (_req, res) => res.json({ ok: true, name: "Jama'ah API" }));
app.get("/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.use("/rooms", rooms);
app.use("/playback", playback);
app.use("/prayer", prayer);
app.use("/quran", quran);
app.use("/alerts", alerts);

const port = process.env.PORT || 8000;

// Create HTTP server and boot Socket.IO
const server = http.createServer(app);
const io = initRealtime(server); // <-- attach

// Make io accessible to routes (emit on updates)
app.set("io", io);

server.listen(port, () => console.log(`API listening on http://localhost:${port}`));
