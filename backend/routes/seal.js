import express from "express";
import {
  authenticateClient,
  createSession,
  deleteSession,
  disputeClient,
  getSession,
  publicSession,
  resetSession,
  scanCourier
} from "../state_engine.js";

export default function sealRoutes({ store, io }) {
  const router = express.Router();

  router.post("/seal", (req, res) => {
    const session = createSession(store, req.body);
    const payload = publicSession(session);
    io.emit("session.update", payload);
    res.status(201).json({
      session_id: session.id,
      courier_otp: session.otps.courier.code,
      client_otp: session.otps.client.code,
      expected_client_gps: session.expected_client_gps
    });
  });

  router.get("/session/:id", (req, res) => {
    const session = getSession(store, req.params.id);
    if (!session) return res.status(404).json({ error: "SESSION_NOT_FOUND" });
    res.json(publicSession(session));
  });

  router.post("/session/:id/reset", (req, res) => {
    const session = resetSession(store, req.params.id);
    if (!session) return res.status(404).json({ error: "SESSION_NOT_FOUND" });
    const payload = publicSession(session);
    io.emit("session.update", payload);
    res.json(payload);
  });

  router.post("/session/:id/clear", (req, res) => {
    const deleted = deleteSession(store, req.params.id);
    if (!deleted) return res.status(404).json({ error: "SESSION_NOT_FOUND" });
    io.emit("session.cleared", { session_id: req.params.id });
    res.json({ ok: true });
  });

  router.post("/courier/scan", (req, res) => {
    const session = getSession(store, req.body.session_id);
    if (!session) return res.status(404).json({ error: "SESSION_NOT_FOUND" });

    const result = scanCourier(session, req.body);
    if (!result.ok) return res.status(400).json({ error: result.reason });

    const payload = publicSession(session);
    io.emit("command.created", payload.commands.at(-1));
    io.emit("session.update", payload);
    res.json(payload);
  });

  router.post("/client/authenticate", (req, res) => {
    const session = getSession(store, req.body.session_id);
    if (!session) return res.status(404).json({ error: "SESSION_NOT_FOUND" });

    const result = authenticateClient(session, req.body);
    if (!result.ok) return res.status(400).json({ error: result.reason });

    const payload = publicSession(session);
    io.emit("command.created", payload.commands.at(-1));
    io.emit("session.update", payload);
    res.json(payload);
  });

  router.post("/client/dispute", (req, res) => {
    const session = getSession(store, req.body.session_id);
    if (!session) return res.status(404).json({ error: "SESSION_NOT_FOUND" });

    disputeClient(session, req.body);
    const payload = publicSession(session);
    if (session.verdict) io.emit("verdict.computed", session.verdict);
    io.emit("session.update", payload);
    res.json(payload);
  });

  return router;
}

