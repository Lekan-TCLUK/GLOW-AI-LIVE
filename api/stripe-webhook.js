import { db, email, browser, storage } from "hatchable";

export const access = "public";
export const methods = ["POST"];

function esc(s) {
  return String(s || "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
}

async function ensurePdf(journey) {
  if (journey.pdf_url) return journey.pdf_url;
  const htmlUrl = "https://glow-ai-v01.hatchable.site/api/report-html?journey_id=" + encodeURIComponent(journey.journey_id);
  const pdf = await browser.pdf(htmlUrl);
  const pdfUrl = await storage.put("glow-plans/" + journey.journey_id + ".pdf", pdf, "application/pdf");
  await db.query("UPDATE glow_journeys SET pdf_url = $1 WHERE journey_id = $2", [pdfUrl, journey.journey_id]);
  return pdfUrl;
}

async function sendPlanEmail(journey) {
  if (journey.email_sent_at) return;
  const pdf = await ensurePdf(journey);
  await email.send({
    to: journey.email,
    subject: "Your Personal Glow Plan™ is ready ✨",
    html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#191715"><h1 style="font-family:Georgia,serif">Your Glow Journey has started. ✨</h1><p>Your personalised <b>Personal Glow Plan™</b> is ready.</p><p><b>Glow Journey ID:</b> ${esc(journey.journey_id)}</p><p>Keep this ID safe. You'll use it for your Day-30 Glow Re-Check.</p><p><a href="${pdf}" style="display:inline-block;padding:14px 20px;background:#191715;color:#fff;text-decoration:none;border-radius:8px">OPEN MY GLOW PLAN</a></p><p style="font-size:12px;color:#6d675f">Your plan is a beauty and wellness resource based on visible appearance characteristics. It is not a medical assessment.</p></div>`
  });
  await db.query("UPDATE glow_journeys SET email_sent_at = now() WHERE journey_id = $1", [journey.journey_id]);
}

async function activateJourney(session) {
  const journeyId = session?.metadata?.journey_id || session?.client_reference_id;
  if (!journeyId) throw new Error("Stripe session has no Glow Journey ID");
  const found = await db.query("SELECT * FROM glow_journeys WHERE journey_id = $1 LIMIT 1", [journeyId]);
  if (!found.rows[0]) throw new Error("Glow Journey not found");

  await db.query(
    "UPDATE glow_journeys SET payment_status = 'paid', stripe_session_id = $1, paid_at = COALESCE(paid_at, now()) WHERE journey_id = $2",
    [session.id, journeyId]
  );
  const updated = (await db.query("SELECT * FROM glow_journeys WHERE journey_id = $1 LIMIT 1", [journeyId])).rows[0];
  try { await sendPlanEmail(updated); } catch (mailError) { console.error("Plan email failed", mailError); }
  return journeyId;
}

function rawBytes(raw) {
  if (raw instanceof Uint8Array) return raw;
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
  if (raw && raw.buffer instanceof ArrayBuffer) return new Uint8Array(raw.buffer, raw.byteOffset || 0, raw.byteLength);
  if (typeof raw === "string") return new TextEncoder().encode(raw);
  return null;
}

function hex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

function parseSignature(header) {
  const parts = String(header || "").split(",");
  const out = { timestamp: null, signatures: [] };
  for (const part of parts) {
    const [k, v] = part.split("=", 2);
    if (k === "t") out.timestamp = Number(v);
    if (k === "v1" && v) out.signatures.push(v);
  }
  return out;
}

async function verifyStripeSignature(payload, header, secret) {
  const parsed = parseSignature(header);
  if (!parsed.timestamp || !parsed.signatures.length) return false;
  if (!Number.isFinite(parsed.timestamp)) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - parsed.timestamp);
  if (age > 300) return false;
  const signed = new TextEncoder().encode(String(parsed.timestamp) + "." + new TextDecoder().decode(payload));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, signed)));
  return parsed.signatures.some(sig => sig.length === digest.length && crypto.timingSafeEqual
    ? crypto.timingSafeEqual(new TextEncoder().encode(sig), new TextEncoder().encode(digest))
    : sig === digest);
}

export default async function(req, res) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: "Stripe webhook is not configured yet." });

  const signature = req.headers?.["stripe-signature"] || req.headers?.["Stripe-Signature"];
  if (!signature) return res.status(400).json({ error: "Missing Stripe signature." });

  try {
    const bytes = rawBytes(req.rawBody);
    if (!bytes) return res.status(400).json({ error: "Webhook payload could not be read." });
    if (!(await verifyStripeSignature(bytes, signature, secret))) {
      return res.status(400).json({ error: "Invalid webhook signature or payload." });
    }

    const event = JSON.parse(new TextDecoder().decode(bytes));
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data?.object;
      if (session?.payment_status === "paid") await activateJourney(session);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error", error);
    return res.status(400).json({ error: "Invalid webhook signature or payload." });
  }
}