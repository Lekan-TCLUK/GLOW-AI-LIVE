import { db, scheduler, browser, storage } from "hatchable";
import { markAffiliatePayment } from "lib/affiliate-attribution.js";
import { enqueueCustomerEmail, processCustomerEmail } from "lib/customer-email.js";

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
    const updated = (await db.query("SELECT * FROM glow_journeys WHERE journey_id = $1 LIMIT 1", [journeyId])).rows[0];
    try {
      await markAffiliatePayment({journeyInternalId:updated.id,stripeSessionId:stripe.id,stripeCustomerId:stripe.customer||"",paymentStatus:"paid"});
    } catch (affiliateError) {
      console.error("Affiliate attribution payment update failed", affiliateError);
    }
    if (updated.email && updated.journey_started_at && !updated.day30_completed) {
      const reminderAt = new Date(new Date(updated.journey_started_at).getTime() + 28 * 24 * 60 * 60 * 1000);
      if (reminderAt.getTime() > Date.now()) {
        try { await scheduler.at(reminderAt.toISOString(), "/api/day30-reminder", { name: "day29-" + updated.journey_id, payload: { journeyId: updated.journey_id } }); } catch (scheduleError) { console.error("Day-29 reminder schedule failed", scheduleError); }
      }
    }
    let emailSent = Boolean(updated.email_sent_at);
    let pdfUrl = updated.pdf_url || null;
    let emailError = null;
    try {
      if (!emailSent && updated.email) {
        const queued = await enqueueCustomerEmail(updated.journey_id, "EMAIL_PDF");
        if (queued.deliveryId) {
          const delivery = await processCustomerEmail(queued.deliveryId);
          emailSent = Boolean(delivery?.sent);
        } else {
          emailSent = Boolean(queued.sent);
        }
      }
      const refreshed = (await db.query("SELECT pdf_url,email_sent_at FROM glow_journeys WHERE journey_id=$1 LIMIT 1", [journeyId])).rows[0];
      pdfUrl = refreshed?.pdf_url || pdfUrl;
      emailSent = emailSent || Boolean(refreshed?.email_sent_at);
    } catch (mailError) {
      emailError = String(mailError?.message || mailError);
      console.error("Plan email failed", mailError);
    }
    return res.json({ paid: true, journeyId, email: updated.email, pdfUrl, emailSent, emailError, language: updated.language || "en", locale: updated.locale || "en-GB" });
  } catch (error) {
    console.error("Payment verification error", error);
    return res.status(502).json({ error: "We couldn't verify the payment yet. Please refresh and try again." });
  }
}