import { db } from "hatchable";

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
  const { email, sessionId, returnUrl } = req.body || {};
  if (!/^\S+@\S+\.\S+$/.test(String(email || ""))) return res.status(400).json({ error: "A valid email is required." });
  if (!sessionId) return res.status(400).json({ error: "Glow session is required." });

  const existing = await db.query("SELECT journey_id, payment_status, stripe_session_id, pdf_url, email_sent_at FROM glow_journeys WHERE session_id = $1 LIMIT 1", [String(sessionId)]);
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

  const journeyId = existing.rows[0]?.journey_id || ("GJ-" + crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase());
  if (!existing.rows[0]) {
    await db.query(
      "INSERT INTO glow_journeys (journey_id, session_id, email, initial_analysis_json, initial_score) VALUES ($1, $2, $3, $4, $5)",
      [journeyId, String(sessionId), String(email).trim().toLowerCase(), JSON.stringify(analysis.rows[0].analysis_json), Number(analysis.rows[0].overall_score)]
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