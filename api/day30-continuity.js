import { db } from "hatchable";

export const access = "public";
export const methods = ["GET"];

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Referrer-Policy", "no-referrer");
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}

export default async function(req, res) {
  cors(res);
  const token = String(req.query?.t || "").trim();
  if (!token || token.length < 40) return res.status(400).json({ error: "This Glow Check link is invalid or incomplete." });
  try {
    const tokenHash = await sha256(token);
    const q = await db.query(
      "SELECT j.journey_id,j.email,j.payment_status,j.journey_started_at,j.day30_completed,j.day30_entitlement_status,j.language,j.locale FROM glow_access_tokens t JOIN glow_journeys j ON j.id=t.journey_id WHERE t.token_hash=$1 AND t.token_type='DAY30_REMINDER' AND t.revoked_at IS NULL AND t.expires_at>now() LIMIT 1",
      [tokenHash]
    );
    if (!q.rows[0]) return res.status(404).json({ error: "This Glow Check link has expired or is no longer available. Please use your latest Day-30 reminder." });
    const j = q.rows[0];
    if (j.payment_status !== "paid") return res.status(409).json({ error: "This Glow Journey is not active." });
    const day30AvailableAt = j.journey_started_at ? new Date(new Date(j.journey_started_at).getTime() + 30 * 24 * 60 * 60 * 1000) : null;
    if (!day30AvailableAt || Date.now() < day30AvailableAt.getTime()) return res.status(403).json({ error: "Your Day-30 Glow Re-Check is not available yet.", day30Available: false, day30AvailableAt: day30AvailableAt?.toISOString() || null });
    if (j.day30_completed || j.day30_entitlement_status === "CONSUMED") return res.status(409).json({ error: "Your included Day-30 Glow Re-Check has already been used." });
    return res.json({ journeyId: j.journey_id, email: j.email || "", day30Available: true, day30AvailableAt: day30AvailableAt.toISOString(), language: j.language || "en", locale: j.locale || "en-GB" });
  } catch (e) {
    console.error("Day-30 continuity error", e);
    return res.status(500).json({ error: "We couldn't open your Glow Check right now. Please try again." });
  }
}