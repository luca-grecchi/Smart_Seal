import express from "express";
import { drainCommands, getSession } from "../state_engine.js";

export default function commandRoutes({ store }) {
  const router = express.Router();

  router.get("/command/:session_id", (req, res) => {
    const session = getSession(store, req.params.session_id);
    if (!session) return res.status(404).json({ error: "SESSION_NOT_FOUND" });
    res.json({ commands: drainCommands(session) });
  });

  return router;
}

