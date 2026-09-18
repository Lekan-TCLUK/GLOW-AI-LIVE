import { db, email, browser, storage } from "hatchable";

const BASE_URL = "https://glow-ai-v01.hatchable.site";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function text(value) {
  return String(value ?? "");
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

async function freshPlanPdf(journey) {
  const key = "glow-plans/" + journey.journey_id + ".pdf";

  try {
    const existing = await storage.get(key);
    if (existing?.buffer) {
      const url = await storage.put(key, existing.buffer, existing.contentType || "application/pdf");
      await db.query("UPDATE glow_journeys SET pdf_url = $1 WHERE journey_id = $2", [url, journey.journey_id]);
      return url;
    }
  } catch (_) {
    // Generate the PDF below when the existing object is unavailable.
  }

  const htmlUrl = BASE_URL + "/api/report-html?journey_id=" + encodeURIComponent(journey.journey_id);
  const pdf = await browser.pdf(htmlUrl);
  const url = await storage.put(key, pdf, "application/pdf");
  await db.query("UPDATE glow_journeys SET pdf_url = $1 WHERE journey_id = $2", [url, journey.journey_id]);
  return url;
}

async function getJourney(journeyId) {
  const q = await db.query("SELECT * FROM glow_journeys WHERE journey_id = $1 LIMIT 1", [journeyId]);
  return q.rows[0] || null;
}

async function getOrCreateDelivery(journeyId, deliveryType) {
  const existing = await db.query(
    "SELECT * FROM glow_delivery_events WHERE journey_id = $1 AND delivery_type = $2 LIMIT 1",
    [journeyId, deliveryType]
  );
  if (existing.rows[0]) return existing.rows[0];

  const inserted = await db.query(
    "INSERT INTO glow_delivery_events (journey_id,delivery_type,status) VALUES ($1,$2,'QUEUED') ON CONFLICT (journey_id,delivery_type) DO NOTHING RETURNING *",
    [journeyId, deliveryType]
  );
  if (inserted.rows[0]) return inserted.rows[0];

  const retry = await db.query(
    "SELECT * FROM glow_delivery_events WHERE journey_id = $1 AND delivery_type = $2 LIMIT 1",
    [journeyId, deliveryType]
  );
  return retry.rows[0] || null;
}

export async function enqueueCustomerEmail(journeyId, deliveryType) {
  const journey = await getJourney(journeyId);
  if (!journey) throw new Error("Glow Journey not found");

  if (deliveryType === "EMAIL_PDF" && journey.email_sent_at) {
    return { queued: false, sent: true, reason: "ALREADY_SENT" };
  }
  if (deliveryType === "EMAIL_JOURNEY_LINK" && journey.day30_completed) {
    return { queued: false, sent: false, reason: "DAY30_COMPLETED" };
  }
  if (!journey.email) {
    return { queued: false, sent: false, reason: "NO_EMAIL" };
  }

  const event = await getOrCreateDelivery(journey.id, deliveryType);
  if (!event) throw new Error("Could not create email delivery record");

  if (event.status === "SENT") return { queued: false, sent: true, reason: "ALREADY_SENT" };
  if (event.status === "SENDING") return { queued: false, sent: false, reason: "IN_PROGRESS" };

  await db.query(
    "UPDATE glow_delivery_events SET status='QUEUED', failure_reason=NULL WHERE id=$1 AND status IN ('FAILED','QUEUED')",
    [event.id]
  );
  return { queued: true, sent: false, deliveryId: event.id };
}

async function claimDelivery(deliveryId) {
  const q = await db.query(
    "UPDATE glow_delivery_events SET status='SENDING', queued_at=now(), failure_reason=NULL WHERE id=$1 AND status IN ('QUEUED','FAILED') RETURNING *",
    [deliveryId]
  );
  return q.rows[0] || null;
}

async function markSent(deliveryId, providerReference) {
  await db.query(
    "UPDATE glow_delivery_events SET status='SENT', provider_reference=$1, failure_reason=NULL, sent_at=now() WHERE id=$2",
    [providerReference || null, deliveryId]
  );
}

async function markFailed(deliveryId, reason) {
  await db.query(
    "UPDATE glow_delivery_events SET status='FAILED', failure_reason=$1 WHERE id=$2",
    [text(reason).slice(0, 2000), deliveryId]
  );
}

async function sendPlanEmail(journey, deliveryId) {
  const pdfUrl = await freshPlanPdf(journey);
  const subject = "Your Personal Glow Plan™ is ready ✨";
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#191715;line-height:1.6">
    <h1 style="font-family:Georgia,serif">Your Glow Journey has started. ✨</h1>
    <p>Your personalised <b>Personal Glow Plan™</b> is ready.</p>
    <p><b>Glow Journey ID:</b> ${esc(journey.journey_id)}</p>
    <p>Keep this ID safe. You'll use it for your Day-30 Glow Re-Check.</p>
    <p><a href="${esc(pdfUrl)}" style="display:inline-block;padding:14px 20px;background:#191715;color:#fff;text-decoration:none;border-radius:8px">OPEN MY GLOW PLAN</a></p>
    <p style="font-size:12px;color:#6d675f">Your plan is a beauty and wellness resource based on visible appearance characteristics. It is not a medical assessment.</p>
  </div>`;
  const plain = `Your Glow Journey has started.

Your Personal Glow Plan is ready.

Glow Journey ID: ${journey.journey_id}

Open your Glow Plan: ${pdfUrl}

Keep your Glow Journey ID safe. You'll use it for your Day-30 Glow Re-Check.

This plan is a beauty and wellness resource based on visible appearance characteristics. It is not a medical assessment.
`;

  const result = await email.send({ to: journey.email, subject, html, text: plain });
  await db.query("UPDATE glow_journeys SET email_sent_at=COALESCE(email_sent_at,now()) WHERE journey_id=$1", [journey.journey_id]);
  await markSent(deliveryId, result?.message_id || result?.ses_message_id || null);
  return { sent: true, deliveryId };
}

async function sendDay29Email(journey, deliveryId) {
  if (journey.day30_completed) {
    await markSent(deliveryId, "SKIPPED_DAY30_COMPLETED");
    return { sent: false, skipped: true };
  }

  // A retry gets a fresh single-use token. Revoke any older reminder tokens first.
  await db.query(
    "UPDATE glow_access_tokens SET revoked_at=now() WHERE journey_id=$1 AND token_type='DAY30_REMINDER' AND revoked_at IS NULL",
    [journey.id]
  );

  const rawToken = randomToken();
  const tokenHash = await sha256(rawToken);
  await db.query(
    "INSERT INTO glow_access_tokens (journey_id,token_hash,token_type,expires_at) VALUES ($1,$2,'DAY30_REMINDER',now()+interval '7 days')",
    [journey.id, tokenHash]
  );

  const magicUrl = BASE_URL + "/?day30=1&t=" + encodeURIComponent(rawToken);
  const subject = "Your Day-30 Glow Check is tomorrow ✨";
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#191715;line-height:1.6">
    <h1 style="font-family:Georgia,serif;font-weight:500">Your Day-30 Glow Check is tomorrow ✨</h1>
    <p>Tomorrow marks Day 30 of your Glow Journey.</p>
    <p>It's time to see how your glow has changed.</p>
    <p>Your Day-30 Glow Check takes just a few moments. Simply take a fresh selfie under similar conditions to your first Glow Check, and we'll compare your two visual assessments.</p>
    <p style="margin:28px 0"><a href="${esc(magicUrl)}" style="display:inline-block;padding:14px 22px;background:#191715;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;letter-spacing:.02em">START MY GLOW CHECK →</a></p>
    <p>For the most useful comparison, try to use similar lighting, camera position and expression to your first photo.</p>
    <p>Your original Glow Journey is securely linked to your check — no password required.</p>
    <p style="font-size:12px;color:#6d675f;margin-top:26px">This private link is unique to your Glow Journey. Please keep it secure. Your Glow Check is based on visible appearance characteristics and is not a medical assessment.</p>
    <p>SEE YOUR GLOW. START YOUR JOURNEY.</p>
    <p style="font-size:12px;color:#6d675f">GLOW AI™</p>
  </div>`;
  const plain = `Your Day-30 Glow Check is tomorrow.

Tomorrow marks Day 30 of your Glow Journey. It's time to see how your glow has changed.

Start your Glow Check: ${magicUrl}

For the most useful comparison, use similar lighting, camera position and expression to your first photo.

Your original Glow Journey is securely linked to your check — no password required.

This private link is unique to your Glow Journey. Please keep it secure. Your Glow Check is based on visible appearance characteristics and is not a medical assessment.
`;

  const result = await email.send({ to: journey.email, subject, html, text: plain });
  await markSent(deliveryId, result?.message_id || result?.ses_message_id || null);
  return { sent: true, deliveryId };
}

export async function processCustomerEmail(deliveryId) {
  const delivery = await claimDelivery(deliveryId);
  if (!delivery) return { sent: false, skipped: true, reason: "NOT_CLAIMED" };

  try {
    const journey = await getJourneyByInternalId(delivery.journey_id);
    if (!journey) throw new Error("Glow Journey not found");

    if (delivery.delivery_type === "EMAIL_PDF") {
      return await sendPlanEmail(journey, delivery.id);
    }
    if (delivery.delivery_type === "EMAIL_JOURNEY_LINK") {
      return await sendDay29Email(journey, delivery.id);
    }

    throw new Error("Unsupported customer email type: " + delivery.delivery_type);
  } catch (error) {
    await markFailed(delivery.id, error?.message || String(error));
    console.error("Customer email delivery failed", delivery.delivery_type, delivery.journey_id, error);
    return { sent: false, failed: true, deliveryId: delivery.id, error: error?.message || String(error) };
  }
}

async function getJourneyByInternalId(id) {
  const q = await db.query("SELECT * FROM glow_journeys WHERE id=$1 LIMIT 1", [id]);
  return q.rows[0] || null;
}