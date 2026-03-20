// src/routes/waitlist.js
import { Router } from "express";
import supabase from "../services/supabase.js";

const router = Router();

// POST /waitlist/join
router.post("/join", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email required" });
    }

    const { error } = await supabase
      .from("waitlist")
      .insert({ email: email.toLowerCase().trim() });

    // If duplicate email, still return success (don't reveal if already signed up)
    if (error && error.code !== "23505") {
      throw new Error(error.message);
    }

    console.log(`📧 Waitlist signup: ${email}`);
    res.json({ success: true });

  } catch (err) {
    console.error("❌ Waitlist error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /waitlist/count
router.get("/count", async (req, res) => {
  try {
    const { count, error } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    if (error) throw new Error(error.message);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
