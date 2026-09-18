import { db, email } from "hatchable";

export const access = "scheduler";
export const methods = ["POST"];

const BASE_URL = "https://i5g7yz.hatchable.site";

function esc(s) {
  return String(s || "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}

export default async function(req, res) {
  const journeyId = String(req.body?.journeyId || "").trim().toUpperCase();
  if (!journeyId) return res.status(400).json({ error: "Journey ID is required." });

  try {
    const found = await db.query(
      "SELECT id,journey_id,email,payment_status,day30_completed,journey_started_at FROM glow_journeys WHERE journey_id=$1 LIMIT 1",
      [journeyId]
    );
    const journey = found.rows[0];
    if (!journey) return res.status(404).json({ error: "Glow Journey could not be found." });
    if (journey.payment_status !== "paid") return res.status(409).json({ error: "This Glow Journey is not active." });
    if (journey.day30_completed) return res.json({ sent: false, skipped: true, reason: "DAY30_COMPLETED" });
    if (!journey.email) return res.status(409).json({ error: "No customer email is available for this Glow Journey." });

    const rawToken = randomToken();
    const tokenHash = await sha256(rawToken);
    await db.query(
      "INSERT INTO glow_access_tokens (journey_id,token_hash,token_type,expires_at) VALUES ($1,$2,'DAY30_REMINDER',now()+interval '7 days')",
      [journey.id, tokenHash]
    );

    const magicUrl = BASE_URL + "/?day30=1&t=" + encodeURIComponent(rawToken);
    await email.send({
      to: journey.email,
      subject: "Your Day-30 Glow Check is tomorrow ✨",
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#191715;line-height:1.6"><h1 style="font-family:Georgia,serif;font-weight:500">Your Day-30 Glow Check is tomorrow ✨</h1><p>Tomorrow marks Day 30 of your Glow Journey.</p><p>It's time to see how your glow has changed.</p><p>Your Day-30 Glow Check takes just a few moments. Simply take a fresh selfie under similar conditions to your first Glow Check, and we'll compare your two visual assessments.</p><p style="margin:28px 0"><a href="${magicUrl}" style="display:inline-block;padding:14px 22px;background:#191715;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;letter-spacing:.02em">START MY GLOW CHECK →</a></p><p>For the most useful comparison, try to use similar lighting, camera position and expression to your first photo.</p><p>Your original Glow Journey is securely linked to your check — no password required.</p><p style="font-size:12px;color:#6d675f;margin-top:26px">This private link is unique to your Glow Journey. Please keep it secure. Your Glow Check is based on visible appearance characteristics and is not a medical assessment.</p><p>SEE YOUR GLOW. START YOUR JOURNEY.</p><p style="font-size:12px;color:#6d675f">GLOW AI™</p></div>`
    });

    return res.json({ sent: true, journeyId, magicUrl });
  } catch (e) {
    console.error("Day-29 reminder error", e);
    return res.status(500).json({ error: "We couldn't send the Day-30 reminder right now." });
  }
}