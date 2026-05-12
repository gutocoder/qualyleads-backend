// src/index.js
import "dotenv/config";
import express from "express";
import webhookRouter from "./routes/webhook.js";
import smsRouter from "./routes/sms.js";
import stripeRouter from "./routes/stripe.js";
import waitlistRouter from "./routes/waitlist.js";
import zapierRouter from "./routes/zapier.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  const allowed = [process.env.APP_URL,"https://app.qualyleads.com","https://qualyleads.com","https://qualyleads-landing.netlify.app","https://qualyleads-dashboard.netlify.app","http://localhost:5173"].filter(Boolean);
  const origin = req.headers.origin;
  if (allowed.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-webhook-secret");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use("/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/webhook", (req, res, next) => {
  if (req.headers["x-webhook-secret"] !== process.env.WEBHOOK_SECRET) return res.status(401).json({ error: "Unauthorized" });
  next();
});

app.use("/webhook", webhookRouter);
app.use("/sms", smsRouter);
app.use("/stripe", stripeRouter);
app.use("/waitlist", waitlistRouter);
app.use("/zapier", zapierRouter);

app.get("/health", (_, res) => res.json({ status: "ok", service: "qualyleads" }));

app.listen(PORT, () => console.log(`QualyLeads running on port ${PORT}`));
