// src/services/supabaseAdmin.js
// Uses the SERVICE ROLE key to manage auth users
// Only used server-side (Railway) — never expose this key to the frontend

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // service role key — full admin access
);

/**
 * Create a new auth user and send them a magic link to set their password
 */
export async function createClientAccount({ email, businessName, plan }) {
  try {
    // Check if user already exists
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const alreadyExists = existing?.users?.find(u => u.email === email);

    if (alreadyExists) {
      console.log(`👤 Auth user already exists: ${email}`);
      return { userId: alreadyExists.id, isNew: false };
    }

    // Create new auth user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true, // skip email confirmation — we send our own invite
      user_metadata: {
        business_name: businessName,
        plan,
        role: "client",
      },
    });

    if (error) throw new Error(error.message);

    console.log(`✅ Auth user created: ${email} | ID: ${data.user.id}`);

    // Send password reset email so they can set their own password
    await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: "https://app.qualyleads.com",
      },
    });

    return { userId: data.user.id, isNew: true };
  } catch (err) {
    console.error(`❌ Failed to create auth user for ${email}:`, err.message);
    throw err;
  }
}

/**
 * Send a magic login link to an existing user
 */
export async function sendLoginLink(email) {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: "https://app.qualyleads.com",
    },
  });

  if (error) throw new Error(error.message);
  return data;
}

export default supabaseAdmin;
