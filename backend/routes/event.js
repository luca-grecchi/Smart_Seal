import express from "express";
import { getSession, ingestEvent, publicSession } from "../state_engine.js";

export default function eventRoutes({ store, io }) {
  const router = express.Router();

  router.post("/event", (req, res) => {
    const session = getSession(store, req.body.session_id);
    if (!session) return res.status(404).json({ error: "SESSION_NOT_FOUND" });

    const result = ingestEvent(session, req.body);
    if (!result.ok) {
      io.emit("error.event", { error: result.reason, payload: req.body });
      return res.status(400).json({ error: result.reason });
    }

    const payload = publicSession(session);
    io.emit("device.event", session.events.at(-1));
    if (session.verdict) io.emit("verdict.computed", session.verdict);
    io.emit("session.update", payload);
    res.status(201).json(payload);
  });

  return router;
}

