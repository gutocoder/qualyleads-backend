// src/index.js
import "dotenv/config";
import express from "express";
import webhookRouter from "./routes/webhook.js";
import smsRouter from "./routes/sms.js";
import stripeRouter from "./routes/stripe.js";
import waitlistRouter from "./routes/waitlist.js";
import zapierRouter from "./routes/zapier.js";
import { supabase } from "./services/supabase.js";

const app = express();
const PORT = process.env.PORT || 3000;

// ── Supabase keepalive — prevents free tier pausing ──────────────────────
setInterval(async () => {
  await supabase.from("waitlist").select("count");
  console.log("🟢 Supabase keepalive ping");
}, 1000 * 60 * 60 * 24 * 3); // every 3 days

// ── CORS ──────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const allowed = [
    process.env.APP_URL,
    "https://app.qualyleads.com",
    "https://qualyleads.com",
    "https://qualyleads-landing.netlify.app",
    "https://qualyleads-dashboard.netlify.app",
    "http://localhost:5173",
  ].filter(Boolean);
  const origin = req.headers.origin;
  if (allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-webhook-secret");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ── Stripe webhook needs raw body BEFORE express.json() ───────────────────
app.use("/stripe/webhook", express.raw({ type: "application/json" }));

// ── General middleware ─────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Auth guard ────────────────────────────────────────────────────────────
app.use("/webhook", (req, res, next) => {
  const secret = req.headers["x-webhook-secret"];
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────
app.use("/webhook", webhookRouter);
app.use("/sms", smsRouter);
app.use("/stripe", stripeRouter);
app.use("/waitlist", waitlistRouter);
app.use("/zapier", zapierRouter);

// ── Health check ──────────────────────────────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok", service: "qualyleads" }));

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`QualyLeads running on port ${PORT}`);
});
