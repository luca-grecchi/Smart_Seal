import express from "express";

export default function logRoutes({ io }) {
  const router = express.Router();

  router.post("/log", (req, res) => {
    const { message, source = "unknown", timestamp } = req.body;
    io.emit("serial.log", { message, source, timestamp: timestamp ?? Date.now() });
    res.status(204).end();
  });

  return router;
}
