// src/services/loops.js
// Sends transactional emails via Loops.so

const LOOPS_API_KEY = process.env.LOOPS_API_KEY;
const LOOPS_API_URL = "https://app.loops.so/api/v1";

/**
 * Send the client welcome email with dashboard link + webhook URL
 */
export async function sendClientWelcomeEmail({ email, businessName, webhookUrl }) {
  try {
    const res = await fetch(`${LOOPS_API_URL}/transactional`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOOPS_API_KEY}`,
      },
      body: JSON.stringify({
        transactionalId: "cmn94u730000g0iz3uqdxp79z",
        email,
        dataVariables: {
          businessName: businessName || email,
          webhookUrl,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Loops API error");
    }

    console.log(`📧 Welcome email sent to ${email}`);
    return data;
  } catch (err) {
    console.error(`❌ Failed to send welcome email to ${email}:`, err.message);
    throw err;
  }
}
