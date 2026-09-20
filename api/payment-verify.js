import { db, email, browser, storage, scheduler } from "hatchable";
import { markAffiliatePayment } from "lib/affiliate-attribution.js";

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

async function ensurePdf(journey) {
  if (journey.pdf_url && journey.plan_version === "PAID-REPORT-V2") return journey.pdf_url;
  const htmlUrl = "https://app.glow-ai.co/api/report-html?journey_id=" + encodeURIComponent(journey.journey_id);
  const pdf = await browser.pdf(htmlUrl);
  const pdfUrl = await storage.put("glow-plans/" + journey.journey_id + ".pdf", pdf, "application/pdf");
  await db.query("UPDATE glow_journeys SET pdf_url = $1, plan_version='PAID-REPORT-V2' WHERE journey_id = $2", [pdfUrl, journey.journey_id]);
  return pdfUrl;
}

async function sendPlanEmail(journey) {
  const pdf = await ensurePdf(journey);
  if (journey.email_sent_at) return { sent: true, pdfUrl: pdf };
  await email.send({
    to: journey.email,
    subject: "Your Personal Glow Plan™ is ready ✨",
    html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#191715"><h1 style="font-family:Georgia,serif">Your Glow Journey has started. ✨</h1><p>Your personalised <b>Personal Glow Plan™</b> is ready.</p><p><b>Glow Journey ID:</b> ${esc(journey.journey_id)}</p><p>Keep this ID safe. You'll use it for your Day-30 Glow Re-Check.</p><p><a href="${pdf}" style="display:inline-block;padding:14px 20px;background:#191715;color:#fff;text-decoration:none;border-radius:8px">OPEN MY GLOW PLAN</a></p><p style="font-size:12px;color:#6d675f">Your plan is a beauty and wellness resource based on visible appearance characteristics. It is not a medical assessment.</p></div>`
  });
  await db.query("UPDATE glow_journeys SET email_sent_at = now() WHERE journey_id = $1", [journey.journey_id]);
  return { sent: true, pdfUrl: pdf };
}

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
    const journeyId = stripe.metadata?.journey_id || stripe.client_reference_id;
    const found = await db.query("SELECT * FROM glow_journeys WHERE journey_id = $1 LIMIT 1", [journeyId]);
    if (!found.rows[0]) return res.status(404).json({ error: "Glow Journey could not be found." });
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
      const delivery = await sendPlanEmail(updated);
      emailSent = Boolean(delivery?.sent);
      pdfUrl = delivery?.pdfUrl || pdfUrl;
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