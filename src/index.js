// src/index.js
import "dotenv/config";
import express from "express";
import webhookRouter from "./routes/webhook.js";
// ── Supabase keepalive — prevents free tier pausing ──────────────────────
setInterval(async () => {
    await supabase.from("waitlist").select("count");
    console.log("🟢 Supabase keepalive ping");
}, 1000 * 60 * 60 * 24 * 3); // every 3 days

// ── CORS — allow landing page to call the API ──────────────────────────────
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

// ── General middleware ──────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Auth guard for lead webhook ─────────────────────────────────────────────
app.use("/webhook", (req, res, next) => {
  const secret = req.headers["x-webhook-secret"];
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/webhook", webhookRouter);   // POST /webhook/lead
app.use("/sms", smsRouter);           // POST /sms/reply (Twilio)
app.use("/stripe", stripeRouter);     // POST /stripe/create-checkout, POST /stripe/webhook
app.use("/waitlist", waitlistRouter); // POST /waitlist/join, GET /waitlist/count
app.use("/zapier", zapierRouter);     // POST /zapier/lead (public, no auth needed)

// ── Health check ────────────────────────────────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok", service: "qualyleads" }));

// ── Start ────────────────────────────────────────────────────────────────────

// ── Supabase keepalive — prevents free tier pausing ──────────────────────
import { createClient } from "@supabase/supabase-js";
const _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

setInterval(async () => {
    await _supabase.from("waitlist").select("count");
    console.log("🟢 Supabase keepalive ping");
}, 1000 * 60 * 60 * 24 * 3); // every 3 days
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║       QualyLeads Backend v1.1        ║
  ║  AI-Powered Sales Setter for SMEs    ║
  ╠══════════════════════════════════════╣
  ║  🚀  Running on port ${PORT}            ║
  ║  📥  POST /webhook/lead              ║
  ║  💬  POST /sms/reply                 ║
  ║  💳  POST /stripe/create-checkout    ║
  ║  🔔  POST /stripe/webhook            ║
  ║  ❤️   GET  /health                   ║
  ╚══════════════════════════════════════╝
  `);
});
