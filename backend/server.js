import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { Server } from "socket.io";
import sealRoutes from "./routes/seal.js";
import eventRoutes from "./routes/event.js";
import commandRoutes from "./routes/command.js";
import logRoutes from "./routes/log.js";
import { createStore } from "./state_engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashboardDir = path.join(__dirname, "..", "dashboard");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

const store = createStore();
const context = { store, io };

app.use(cors());
app.use(express.json());
app.use(express.static(dashboardDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "smart-seal", timestamp: Date.now() });
});

app.use("/api", sealRoutes(context));
app.use("/api", eventRoutes(context));
app.use("/api", commandRoutes(context));
app.use("/api", logRoutes(context));

io.on("connection", (socket) => {
  socket.emit("session.update", { message: "connected", timestamp: Date.now() });
});

const port = Number(process.env.PORT || 3000);
httpServer.listen(port, () => {
  console.log(`Smart Seal backend running on http://localhost:${port}`);
});

