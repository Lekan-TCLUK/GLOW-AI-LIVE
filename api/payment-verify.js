import { db } from "hatchable";
import { incrementDailyMetric } from "../lib/glow16-intelligence.js";
import { markAffiliatePayment } from "lib/affiliate-attribution.js";
// Customer PDF/email fulfilment is handled by the Stripe webhook path.

export const access = "public";
export const methods = ["POST"];

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

async function stripeGet(path, key) {
  const r = await fetch("https://api.stripe.com/v1/" + path, { headers: { Authorization: "Basic " + btoa(key + ":") } });
  const body = await r.json();
  if (!r.ok) throw new Error(body?.error?.message || "Stripe request failed");
  return body;
}

function esc(s) { return String(s || "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }

// Paid-plan PDF generation and email delivery are handled by lib/customer-email.js.

export default async function(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(503).json({ error: "Payments are not configured yet." });
  const sessionId = String(req.body?.sessionId || "");
  if (!sessionId) return res.status(400).json({ error: "Payment session is required." });
  try {
    const stripe = await stripeGet("checkout/sessions/" + encodeURIComponent(sessionId), key);
    if (stripe.payment_status !== "paid") return res.status(402).json({ error: "Payment has not been completed yet.", status: stripe.payment_status });
    const metadataJourneyId = String(stripe.metadata?.journey_id || "").trim().toUpperCase();
    const metadataSessionId = String(stripe.metadata?.session_id || "").trim();
    const clientRef = String(stripe.client_reference_id || "").trim();
    let found = metadataJourneyId ? await db.query("SELECT * FROM glow_journeys WHERE journey_id = $1 LIMIT 1", [metadataJourneyId]) : {rows:[]};
    if (!found.rows[0] && metadataSessionId) found = await db.query("SELECT * FROM glow_journeys WHERE session_id = $1 OR stripe_session_id = $1 LIMIT 1", [metadataSessionId]);
    if (!found.rows[0] && clientRef && /^GJ-[A-Z0-9]{8,20}$/.test(clientRef.toUpperCase())) found = await db.query("SELECT * FROM glow_journeys WHERE journey_id = $1 LIMIT 1", [clientRef.toUpperCase()]);
    if (!found.rows[0] && stripe.customer_details?.email) found = await db.query("SELECT * FROM glow_journeys WHERE email = $1 AND payment_status <> 'paid' ORDER BY created_at DESC LIMIT 1", [String(stripe.customer_details.email).trim().toLowerCase()]);
    if (!found.rows[0]) return res.status(409).json({ error: "Your payment was received. We're reconnecting your Glow Journey now.", recovery: true, paymentReceived: true });
    const journeyId = found.rows[0].journey_id;
    await db.query("UPDATE glow_journeys SET payment_status = 'paid', paid_at = COALESCE(paid_at, now()), journey_started_at = COALESCE(journey_started_at, now()), journey_status = CASE WHEN journey_status = 'PENDING_PAYMENT' THEN 'ACTIVE' ELSE journey_status END WHERE journey_id = $1", [journeyId]);
    await incrementDailyMetric("journeys_paid");
    const updated = (await db.query("SELECT * FROM glow_journeys WHERE journey_id = $1 LIMIT 1", [journeyId])).rows[0];
    const paymentIntentId = typeof stripe.payment_intent === "object" ? String(stripe.payment_intent?.id || "") : String(stripe.payment_intent || "");
    await db.query(
      "INSERT INTO glow_payments (journey_id,provider,provider_session_id,provider_payment_id,amount_cents,currency,status,payment_reference,paid_at,updated_at) VALUES ($1,'STRIPE',$2,$3,$4,$5,'PAID',$6,COALESCE($7,now()),now()) ON CONFLICT (provider,provider_session_id) DO UPDATE SET provider_payment_id=EXCLUDED.provider_payment_id,amount_cents=EXCLUDED.amount_cents,currency=EXCLUDED.currency,status='PAID',payment_reference=EXCLUDED.payment_reference,paid_at=COALESCE(glow_payments.paid_at,EXCLUDED.paid_at),updated_at=now()",
      [updated.id, stripe.id, paymentIntentId || null, Number(stripe.amount_total || 0), String(stripe.currency || "usd").toLowerCase(), paymentIntentId || stripe.id, stripe.created ? new Date(Number(stripe.created) * 1000).toISOString() : null]
    );
    try {
      await markAffiliatePayment({journeyInternalId:updated.id,stripeSessionId:stripe.id,stripeCustomerId:stripe.customer||"",paymentStatus:"paid"});
    } catch (affiliateError) {
      console.error("Affiliate attribution payment update failed", affiliateError);
    }
    // Customer return verification is intentionally lightweight. Stripe webhook handles PDF/email fulfilment.
    // The browser must not wait for report generation or email delivery before showing the paid Journey.
    return res.json({ paid: true, journeyId, email: updated.email, pdfUrl: updated.pdf_url || null, emailSent: Boolean(updated.email_sent_at), language: updated.language || "en", locale: updated.locale || "en-GB" });
  } catch (error) {
    console.error("Payment verification error", error);
    return res.status(502).json({ error: "We couldn't verify the payment yet. Please refresh and try again." });
  }
}