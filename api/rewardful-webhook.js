import { db } from "hatchable";

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

async function verifySignature(payload, signature, secret) {
  if (!payload || !signature || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, payload)));
  return String(signature).trim() === digest;
}

function iso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function upsertReferral(referral, event) {
  if (!referral?.id) return { matched: false };

  const affiliate = referral.affiliate || {};
  const campaign = affiliate.campaign || {};
  const link = referral.link || {};
  const customer = referral.customer || {};
  const state = String(referral.conversion_state || "visitor").toLowerCase();
  const eventType = String(event?.type || "");
  const attributionStatus =
    state === "conversion" || eventType === "referral.converted" ? "CONVERTED" :
    eventType === "referral.deleted" ? "DELETED" : "ATTRIBUTED";

  const q = await db.query(
    "SELECT id FROM glow_affiliate_attributions WHERE rewardful_referral_id=$1 LIMIT 1",
    [String(referral.id)]
  );
  if (!q.rows[0]) return { matched: false };

  const updated = await db.query(
    "UPDATE glow_affiliate_attributions SET rewardful_affiliate_id=COALESCE(NULLIF($1,''),rewardful_affiliate_id), affiliate_first_name=COALESCE(NULLIF($2,''),affiliate_first_name), affiliate_last_name=COALESCE(NULLIF($3,''),affiliate_last_name), affiliate_email=COALESCE(NULLIF($4,''),affiliate_email), affiliate_state=COALESCE(NULLIF($5,''),affiliate_state), rewardful_campaign_id=COALESCE(NULLIF($6,''),rewardful_campaign_id), rewardful_campaign_name=COALESCE(NULLIF($7,''),rewardful_campaign_name), rewardful_link_id=COALESCE(NULLIF($8,''),rewardful_link_id), rewardful_link_token=COALESCE(NULLIF($9,''),rewardful_link_token), conversion_state=$10, attribution_status=$11, customer_email=COALESCE(NULLIF($12,''),customer_email), stripe_customer_id=COALESCE(NULLIF($13,''),stripe_customer_id), stripe_account_id=COALESCE(NULLIF($14,''),stripe_account_id), rewardful_referral_created_at=COALESCE($15,rewardful_referral_created_at), rewardful_lead_at=COALESCE($16,rewardful_lead_at), rewardful_conversion_at=COALESCE($17,rewardful_conversion_at), rewardful_updated_at=COALESCE($18,rewardful_updated_at), last_rewardful_event_id=COALESCE(NULLIF($19,''),last_rewardful_event_id), last_rewardful_event_type=COALESCE(NULLIF($20,''),last_rewardful_event_type), raw_rewardful_referral=$21, raw_rewardful_affiliate=$22, updated_at=now() WHERE id=$23 RETURNING *",
    [
      String(affiliate.id || ""),
      String(affiliate.first_name || ""),
      String(affiliate.last_name || ""),
      String(affiliate.email || ""),
      String(affiliate.state || ""),
      String(campaign.id || ""),
      String(campaign.name || ""),
      String(link.id || ""),
      String(link.token || ""),
      state,
      attributionStatus,
      String(customer.email || ""),
      String(referral.stripe_customer_id || customer.id || ""),
      String(referral.stripe_account_id || ""),
      iso(referral.created_at),
      eventType === "referral.lead" ? iso(referral.became_lead_at || referral.updated_at) : null,
      eventType === "referral.converted" || state === "conversion" ? iso(referral.became_conversion_at || referral.updated_at) : null,
      iso(referral.updated_at),
      String(event?.id || ""),
      eventType,
      JSON.stringify(referral),
      JSON.stringify(affiliate),
      q.rows[0].id
    ]
  );

  return { matched: true, attributionId: updated.rows[0]?.id || null };
}

async function updateAffiliate(affiliate, event) {
  if (!affiliate?.id) return { matched: false };
  const campaign = affiliate.campaign || {};
  const updated = await db.query(
    "UPDATE glow_affiliate_attributions SET affiliate_first_name=COALESCE(NULLIF($1,''),affiliate_first_name), affiliate_last_name=COALESCE(NULLIF($2,''),affiliate_last_name), affiliate_email=COALESCE(NULLIF($3,''),affiliate_email), affiliate_state=COALESCE(NULLIF($4,''),affiliate_state), rewardful_campaign_id=COALESCE(NULLIF($5,''),rewardful_campaign_id), rewardful_campaign_name=COALESCE(NULLIF($6,''),rewardful_campaign_name), raw_rewardful_affiliate=$7, last_rewardful_event_id=$8, last_rewardful_event_type=$9, updated_at=now() WHERE rewardful_affiliate_id=$10",
    [
      String(affiliate.first_name || ""),
      String(affiliate.last_name || ""),
      String(affiliate.email || ""),
      String(affiliate.state || ""),
      String(campaign.id || ""),
      String(campaign.name || ""),
      JSON.stringify(affiliate),
      String(event?.id || ""),
      String(event?.type || ""),
      String(affiliate.id)
    ]
  );
  return { matched: updated.rowCount > 0 };
}

async function updateCommission(commission, event) {
  if (!commission?.id) return { matched: false };
  const sale = commission.sale || {};
  const referral = sale.referral || {};
  if (!referral.id) return { matched: false };

  const updated = await db.query(
    "UPDATE glow_affiliate_attributions SET rewardful_sale_id=COALESCE(NULLIF($1,''),rewardful_sale_id), rewardful_commission_id=COALESCE(NULLIF($2,''),rewardful_commission_id), sale_amount_cents=COALESCE($3,sale_amount_cents), sale_currency=COALESCE(NULLIF($4,''),sale_currency), commission_amount_cents=COALESCE($5,commission_amount_cents), commission_currency=COALESCE(NULLIF($6,''),commission_currency), commission_state=COALESCE(NULLIF($7,''),commission_state), commission_due_at=COALESCE($8,commission_due_at), commission_paid_at=COALESCE($9,commission_paid_at), commission_voided_at=COALESCE($10,commission_voided_at), last_rewardful_event_id=$11, last_rewardful_event_type=$12, raw_rewardful_sale=$13, raw_rewardful_commission=$14, updated_at=now() WHERE rewardful_referral_id=$15 RETURNING id",
    [
      String(sale.id || ""),
      String(commission.id || ""),
      Number.isFinite(Number(sale.sale_amount_cents)) ? Number(sale.sale_amount_cents) : null,
      String(sale.currency || ""),
      Number.isFinite(Number(commission.amount)) ? Number(commission.amount) : null,
      String(commission.currency || ""),
      String(commission.state || ""),
      iso(commission.due_at),
      iso(commission.paid_at),
      iso(commission.voided_at),
      String(event?.id || ""),
      String(event?.type || ""),
      JSON.stringify(sale),
      JSON.stringify(commission),
      String(referral.id)
    ]
  );
  return { matched: updated.rowCount > 0 };
}

export default async function(req, res) {
  const secret = process.env.REWARDFUL_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: "Rewardful webhook is not configured yet." });

  const bytes = rawBytes(req.rawBody);
  if (!bytes) return res.status(400).json({ error: "Webhook payload could not be read." });

  const signature = req.headers?.["x-rewardful-signature"] || req.headers?.["X-Rewardful-Signature"];
  if (!signature || !(await verifySignature(bytes, signature, secret))) {
    return res.status(401).json({ error: "Invalid Rewardful webhook signature." });
  }

  try {
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    const event = payload?.event || {};
    const object = payload?.object || {};
    let result = { matched: false };

    if (String(event.type || "").startsWith("referral.")) {
      result = await upsertReferral(object, event);
    } else if (String(event.type || "").startsWith("affiliate.")) {
      result = await updateAffiliate(object, event);
    } else if (String(event.type || "").startsWith("commission.")) {
      result = await updateCommission(object, event);
    }

    return res.json({ received: true, event: event.type || null, ...result });
  } catch (error) {
    console.error("Rewardful webhook error", error);
    return res.status(400).json({ error: "Invalid Rewardful webhook payload." });
  }
}