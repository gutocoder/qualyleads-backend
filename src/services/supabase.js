// services/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Save a new lead and their initial AI message to the DB
 */
export async function saveLead({ name, phone, industry, blueprint, aiMessage }) {
  const { data, error } = await supabase
    .from("leads")
    .insert({
      name,
      phone,
      industry,
      blueprint_used: blueprint.industry,
      status: "contacted",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Supabase saveLead error: ${error.message}`);

  // Save the first message in the chat log
  await saveMessage({
    lead_id: data.id,
    role: "assistant",
    content: aiMessage,
  });

  return data.id;
}

/**
 * Save a chat message (role: 'user' or 'assistant')
 */
export async function saveMessage({ lead_id, role, content }) {
  const { error } = await supabase.from("messages").insert({
    lead_id,
    role,
    content,
  });

  if (error) throw new Error(`Supabase saveMessage error: ${error.message}`);
}

/**
 * Get full chat history for a lead (by phone number)
 */
export async function getChatHistory(phone) {
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (leadError || !lead) return null;

  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select("role, content")
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: true });

  if (msgError) throw new Error(`Supabase getChatHistory error: ${msgError.message}`);

  return { leadId: lead.id, messages };
}

/**
 * Update lead status (e.g. 'booked', 'unresponsive')
 */
export async function updateLeadStatus(leadId, status) {
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId);

  if (error) throw new Error(`Supabase updateLeadStatus error: ${error.message}`);
}

export default supabase;
