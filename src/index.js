// src/index.js
import "dotenv/config";
import express from "express";
import webhookRouter from "./routes/webhook.js";
import smsRouter from "./routes/sms.js";

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Required for Twilio form data

// ── Optional: Simple auth guard for the /webhook/lead endpoint ─────────────
app.use("/webhook", (req, res, next) => {
  const secret = req.headers["x-webhook-secret"];
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/webhook", webhookRouter);   // POST /webhook/lead
app.use("/sms", smsRouter);           // POST /sms/reply  (Twilio points here)

// ── Health check ────────────────────────────────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok", service: "qualyleads" }));

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║       QualyLeads Backend v1.0        ║
  ║  AI-Powered Sales Setter for SMEs    ║
  ╠══════════════════════════════════════╣
  ║  🚀  Running on port ${PORT}            ║
  ║  📥  POST /webhook/lead              ║
  ║  💬  POST /sms/reply                 ║
  ║  ❤️   GET  /health                   ║
  ╚══════════════════════════════════════╝
  `);
});
