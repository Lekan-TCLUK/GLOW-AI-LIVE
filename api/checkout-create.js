import { db } from "hatchable";

async function sha256(value){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");}

export const access = "public";
export const methods = ["POST"];

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

function formEncode(obj) {
  const p = new URLSearchParams();
  for (const [k,v] of Object.entries(obj)) p.set(k, String(v));
  return p.toString();
}

function safeReturnUrl(value) {
  try {
    const u = new URL(String(value || ""));
    if (u.protocol !== "https:") return "https://glow-ai-v3-connected-hatchable.vercel.app/";
    if (u.hostname.endsWith(".vercel.app") || u.hostname === "glowai.com" || u.hostname.endsWith(".hatchable.site")) return u.origin + "/";
  } catch {}
  return "https://glow-ai-v3-connected-hatchable.vercel.app/";
}

export default async function(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(503).json({ error: "Payments are not configured yet." });
  const { email: suppliedEmail, sessionId: suppliedSessionId, returnUrl, continuityToken, legalAccepted, digitalAccepted, termsVersion, privacyVersion } = req.body || {};
  if (legalAccepted !== true || digitalAccepted !== true) return res.status(400).json({ error: "Please accept the Terms & Conditions and confirm immediate digital delivery before continuing." });
  let email = String(suppliedEmail || "").trim().toLowerCase();
  let sessionId = String(suppliedSessionId || "").trim();
  let continuityJourneyId = null;
  if(continuityToken){
    const tokenHash=await sha256(String(continuityToken).trim());
    const tq=await db.query("SELECT j.id,j.journey_id,j.session_id,j.email,j.payment_status,j.stripe_session_id,j.pdf_url,j.email_sent_at FROM glow_access_tokens t JOIN glow_journeys j ON j.id=t.journey_id WHERE t.token_hash=$1 AND t.token_type='FREE_CONTINUITY' AND t.revoked_at IS NULL AND t.expires_at>now() LIMIT 1",[tokenHash]);
    if(!tq.rows[0]) return res.status(404).json({error:"This Glow Journey link has expired or is no longer available."});
    const linked=tq.rows[0]; continuityJourneyId=linked.id; sessionId=linked.session_id; if(!email)email=String(linked.email||"").trim().toLowerCase();
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "A valid email is required." });
  if (!sessionId) return res.status(400).json({ error: "Glow session is required." });

  const existing = continuityJourneyId ? await db.query("SELECT id, journey_id, payment_status, stripe_session_id, pdf_url, email_sent_at FROM glow_journeys WHERE id = $1 LIMIT 1", [continuityJourneyId]) : await db.query("SELECT id, journey_id, payment_status, stripe_session_id, pdf_url, email_sent_at FROM glow_journeys WHERE session_id = $1 LIMIT 1", [sessionId]);
  if (existing.rows[0]?.payment_status === "paid" && existing.rows[0]?.stripe_session_id) {
    return res.json({
      alreadyPaid: true,
      journeyId: existing.rows[0].journey_id,
      pdfUrl: existing.rows[0].pdf_url || null,
      emailSent: !!existing.rows[0].email_sent_at
    });
  }

  const analysis = await db.query("SELECT analysis_json, overall_score FROM glow_analyses WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1", [String(sessionId)]);
  if (!analysis.rows[0]) return res.status(404).json({ error: "Your Glow analysis could not be found. Please run your Glow Check again." });
  const assessment = await db.query("SELECT id FROM glow_assessments WHERE session_id = $1 AND assessment_type = 'INITIAL' AND assessment_status = 'VALID' ORDER BY created_at ASC LIMIT 1", [String(sessionId)]);
  if (!assessment.rows[0]) return res.status(409).json({ error: "Your Glow assessment could not be linked. Please run your Glow Check again." });

  const journeyId = existing.rows[0]?.journey_id || ("GJ-" + crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase());
  if (!existing.rows[0]) {
    await db.query(
      "INSERT INTO glow_journeys (journey_id, session_id, email, initial_assessment_id, initial_analysis_json, initial_score, terms_accepted_at, privacy_acknowledged_at, digital_content_accepted_at, terms_version, privacy_version) VALUES ($1, $2, $3, $4, $5, $6, now(), now(), now(), $7, $8)",
      [journeyId, String(sessionId), String(email).trim().toLowerCase(), assessment.rows[0].id, JSON.stringify(analysis.rows[0].analysis_json), Number(analysis.rows[0].overall_score), String(termsVersion || "2026-09-17").slice(0, 40), String(privacyVersion || "2026-09-17").slice(0, 40)]
    );
  } else {
    await db.query(
      "UPDATE glow_journeys SET email = $1, terms_accepted_at = COALESCE(terms_accepted_at, now()), privacy_acknowledged_at = COALESCE(privacy_acknowledged_at, now()), digital_content_accepted_at = COALESCE(digital_content_accepted_at, now()), terms_version = COALESCE(terms_version, $2), privacy_version = COALESCE(privacy_version, $3) WHERE id = $4",
      [String(email).trim().toLowerCase(), String(termsVersion || "2026-09-17").slice(0, 40), String(privacyVersion || "2026-09-17").slice(0, 40), existing.rows[0].id]
    );
  }

  const successBase = safeReturnUrl(returnUrl);
  const params = formEncode({
    mode: "payment",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][product_data][name]": "Personal Glow Plan™",
    "line_items[0][price_data][product_data][description]": "Personalised Glow Analysis, 7-Day Reset, 30-Day Journey and one Day-30 Glow Re-Check.",
    "line_items[0][price_data][unit_amount]": "999",
    "line_items[0][quantity]": "1",
    customer_email: String(email).trim().toLowerCase(),
    client_reference_id: journeyId,
    "metadata[journey_id]": journeyId,
    "metadata[session_id]": String(sessionId),
    success_url: successBase + "?payment=success&session_id={CHECKOUT_SESSION_ID}",
    cancel_url: successBase + "?payment=cancelled"
  });

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(key + ":"), "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  const stripe = await stripeRes.json();
  if (!stripeRes.ok) {
    console.error("Stripe checkout error", stripe);
    return res.status(502).json({ error: "We couldn't start secure checkout. Please try again." });
  }

  await db.query("UPDATE glow_journeys SET stripe_session_id = $1, email = $2 WHERE journey_id = $3", [stripe.id, String(email).trim().toLowerCase(), journeyId]);
  return res.json({ checkoutUrl: stripe.url, journeyId });
}