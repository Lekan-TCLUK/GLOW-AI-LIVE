import { db, scheduler } from "hatchable";
import { enqueueCustomerEmail, processCustomerEmail } from "lib/customer-email.js";
import { markAffiliatePayment } from "lib/affiliate-attribution.js";

export const access = "public";
export const methods = ["POST"];

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
  if (!parsed.timestamp || !parsed.signatures.length || !Number.isFinite(parsed.timestamp)) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - parsed.timestamp);
  if (age > 300) return false;
  const signed = new TextEncoder().encode(String(parsed.timestamp) + "." + new TextDecoder().decode(payload));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, signed)));
  return parsed.signatures.some(sig => sig.length === digest.length && crypto.timingSafeEqual
    ? crypto.timingSafeEqual(new TextEncoder().encode(sig), new TextEncoder().encode(digest))
    : sig === digest);
}

async function activateJourney(session) {
  const journeyId = session?.metadata?.journey_id || session?.client_reference_id;
  if (!journeyId) throw new Error("Stripe session has no Glow Journey ID");

  const found = await db.query("SELECT * FROM glow_journeys WHERE journey_id=$1 LIMIT 1", [journeyId]);
  if (!found.rows[0]) throw new Error("Glow Journey not found");

  await db.query(
    "UPDATE glow_journeys SET payment_status='paid', stripe_session_id=$1, paid_at=COALESCE(paid_at,now()), journey_started_at=COALESCE(journey_started_at,now()), journey_status=CASE WHEN journey_status='PENDING_PAYMENT' THEN 'ACTIVE' ELSE journey_status END WHERE journey_id=$2",
    [session.id, journeyId]
  );

  const updated = (await db.query("SELECT * FROM glow_journeys WHERE journey_id=$1 LIMIT 1", [journeyId])).rows[0];
  const paymentIntentId = typeof session.payment_intent === "object" ? String(session.payment_intent?.id || "") : String(session.payment_intent || "");
  await db.query(
    "INSERT INTO glow_payments (journey_id,provider,provider_session_id,provider_payment_id,amount_cents,currency,status,payment_reference,paid_at,updated_at) VALUES ($1,'STRIPE',$2,$3,$4,$5,'PAID',$6,COALESCE($7,now()),now()) ON CONFLICT (provider,provider_session_id) DO UPDATE SET provider_payment_id=EXCLUDED.provider_payment_id,amount_cents=EXCLUDED.amount_cents,currency=EXCLUDED.currency,status='PAID',payment_reference=EXCLUDED.payment_reference,paid_at=COALESCE(glow_payments.paid_at,EXCLUDED.paid_at),updated_at=now()",
    [updated.id, session.id, paymentIntentId || null, Number(session.amount_total || 0), String(session.currency || "usd").toLowerCase(), paymentIntentId || session.id, session.created ? new Date(Number(session.created) * 1000).toISOString() : null]
  );

  try {
    await markAffiliatePayment({journeyInternalId:updated.id,stripeSessionId:session.id,stripeCustomerId:session.customer||"",paymentStatus:"paid"});
  } catch (affiliateError) {
    console.error("Affiliate attribution payment update failed", affiliateError);
  }

  if (updated.email && updated.journey_started_at && !updated.day30_completed) {
    const reminderAt = new Date(new Date(updated.journey_started_at).getTime() + 28 * 24 * 60 * 60 * 1000);
    if (reminderAt.getTime() > Date.now()) {
      try {
        await scheduler.at(reminderAt.toISOString(), "/api/day30-reminder", {
          name: "day29-" + updated.journey_id,
          payload: { journeyId: updated.journey_id }
        });
      } catch (scheduleError) {
        console.error("Day-29 reminder schedule failed", scheduleError);
      }
    }
  }

  if (updated.email) {
    try {
      const queued = await enqueueCustomerEmail(updated.journey_id, "EMAIL_PDF");
      if (queued.queued && queued.deliveryId) await processCustomerEmail(queued.deliveryId);
      const onboarding = await enqueueCustomerEmail(updated.journey_id, "EMAIL_PAID_ONBOARDING");
      if (onboarding.queued && onboarding.deliveryId) await processCustomerEmail(onboarding.deliveryId);
    } catch (mailError) {
      console.error("Plan email queue/send failed", mailError);
    }
  }

  return journeyId;
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
    console.log("Stripe webhook received", { eventId: event.id || null, eventType: event.type || null, livemode: Boolean(event.livemode) });
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