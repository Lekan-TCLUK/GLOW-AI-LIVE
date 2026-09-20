import { db } from "hatchable";

export const REWARDFUL_CAMPAIGN_ID = "493cec";

function clean(value) {
  return String(value ?? "").trim();
}

export async function ensureAffiliateAttribution({
  journeyInternalId,
  referralId,
  customerEmail = null,
  stripeSessionId = null,
  stripeCustomerId = null,
  localPaymentStatus = null,
  affiliateSnapshot = null,
  campaignSnapshot = null
} = {}) {
  const referral = clean(referralId);
  if (!journeyInternalId || !referral) return null;
  const affiliate = affiliateSnapshot && typeof affiliateSnapshot === "object" ? affiliateSnapshot : {};
  const campaign = campaignSnapshot?.campaign && typeof campaignSnapshot.campaign === "object" ? campaignSnapshot.campaign : (campaignSnapshot && typeof campaignSnapshot === "object" ? campaignSnapshot : {});
  const affiliateId = clean(affiliate.id);
  const affiliateFirstName = clean(affiliate.first_name);
  const affiliateLastName = clean(affiliate.last_name);
  const affiliateEmail = clean(affiliate.email);
  const affiliateState = clean(affiliate.state);
  const campaignId = clean(campaign.id) || REWARDFUL_CAMPAIGN_ID;
  const campaignName = clean(campaign.name);
  const linkId = clean(affiliate.link?.id);
  const linkToken = clean(affiliate.token || affiliate.link?.token);
  const hasBrowserSnapshot = Boolean(affiliateId || affiliateFirstName || affiliateLastName || campaignName);

  const existing = await db.query(
    "SELECT * FROM glow_affiliate_attributions WHERE journey_id=$1 OR rewardful_referral_id=$2 ORDER BY created_at ASC LIMIT 1",
    [journeyInternalId, referral]
  );

  if (existing.rows[0]) {
    const row = existing.rows[0];
    if (row.journey_id !== journeyInternalId) {
      console.error("Affiliate attribution referral already belongs to another Journey", referral, row.journey_id, journeyInternalId);
      return row;
    }

    const updated = await db.query(
      "UPDATE glow_affiliate_attributions SET rewardful_affiliate_id=COALESCE(NULLIF($1,''),rewardful_affiliate_id), affiliate_first_name=COALESCE(NULLIF($2,''),affiliate_first_name), affiliate_last_name=COALESCE(NULLIF($3,''),affiliate_last_name), affiliate_email=COALESCE(NULLIF($4,''),affiliate_email), affiliate_state=COALESCE(NULLIF($5,''),affiliate_state), rewardful_campaign_id=COALESCE(NULLIF($6,''),rewardful_campaign_id), rewardful_campaign_name=COALESCE(NULLIF($7,''),rewardful_campaign_name), rewardful_link_id=COALESCE(NULLIF($8,''),rewardful_link_id), rewardful_link_token=COALESCE(NULLIF($9,''),rewardful_link_token), customer_email=COALESCE(NULLIF($10,''),customer_email), stripe_session_id=COALESCE(NULLIF($11,''),stripe_session_id), stripe_customer_id=COALESCE(NULLIF($12,''),stripe_customer_id), local_payment_status=COALESCE(NULLIF($13,''),local_payment_status), raw_rewardful_affiliate=CASE WHEN $14 THEN $15::jsonb ELSE raw_rewardful_affiliate END, updated_at=now() WHERE id=$16 RETURNING *",
      [affiliateId, affiliateFirstName, affiliateLastName, affiliateEmail, affiliateState, campaignId, campaignName, linkId, linkToken, clean(customerEmail), clean(stripeSessionId), clean(stripeCustomerId), clean(localPaymentStatus), hasBrowserSnapshot, JSON.stringify(affiliate), row.id]
    );
    return updated.rows[0];
  }

  const inserted = await db.query(
    "INSERT INTO glow_affiliate_attributions (journey_id,rewardful_referral_id,rewardful_affiliate_id,affiliate_first_name,affiliate_last_name,affiliate_email,affiliate_state,rewardful_campaign_id,rewardful_campaign_name,rewardful_link_id,rewardful_link_token,customer_email,stripe_session_id,stripe_customer_id,local_payment_status,raw_rewardful_affiliate,attribution_source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (rewardful_referral_id) DO UPDATE SET customer_email=COALESCE(NULLIF(EXCLUDED.customer_email,''),glow_affiliate_attributions.customer_email), stripe_session_id=COALESCE(NULLIF(EXCLUDED.stripe_session_id,''),glow_affiliate_attributions.stripe_session_id), stripe_customer_id=COALESCE(NULLIF(EXCLUDED.stripe_customer_id,''),glow_affiliate_attributions.stripe_customer_id), local_payment_status=COALESCE(NULLIF(EXCLUDED.local_payment_status,''),glow_affiliate_attributions.local_payment_status), rewardful_affiliate_id=COALESCE(NULLIF(EXCLUDED.rewardful_affiliate_id,''),glow_affiliate_attributions.rewardful_affiliate_id), affiliate_first_name=COALESCE(NULLIF(EXCLUDED.affiliate_first_name,''),glow_affiliate_attributions.affiliate_first_name), affiliate_last_name=COALESCE(NULLIF(EXCLUDED.affiliate_last_name,''),glow_affiliate_attributions.affiliate_last_name), affiliate_email=COALESCE(NULLIF(EXCLUDED.affiliate_email,''),glow_affiliate_attributions.affiliate_email), rewardful_campaign_id=COALESCE(NULLIF(EXCLUDED.rewardful_campaign_id,''),glow_affiliate_attributions.rewardful_campaign_id), rewardful_campaign_name=COALESCE(NULLIF(EXCLUDED.rewardful_campaign_name,''),glow_affiliate_attributions.rewardful_campaign_name), rewardful_link_id=COALESCE(NULLIF(EXCLUDED.rewardful_link_id,''),glow_affiliate_attributions.rewardful_link_id), rewardful_link_token=COALESCE(NULLIF(EXCLUDED.rewardful_link_token,''),glow_affiliate_attributions.rewardful_link_token), raw_rewardful_affiliate=CASE WHEN $18 THEN $16 ELSE glow_affiliate_attributions.raw_rewardful_affiliate END, attribution_source=CASE WHEN $18 THEN 'rewardful_browser' ELSE glow_affiliate_attributions.attribution_source END, updated_at=now() RETURNING *",
    [journeyInternalId, referral, affiliateId, affiliateFirstName, affiliateLastName, affiliateEmail, affiliateState, campaignId, campaignName, linkId, linkToken, clean(customerEmail), clean(stripeSessionId), clean(stripeCustomerId), clean(localPaymentStatus), JSON.stringify(affiliate), hasBrowserSnapshot]
  );
  return inserted.rows[0] || null;
}

export async function markAffiliatePayment({
  journeyInternalId,
  stripeSessionId,
  stripeCustomerId,
  paymentStatus = "paid"
} = {}) {
  if (!journeyInternalId) return null;
  const updated = await db.query(
    "UPDATE glow_affiliate_attributions SET stripe_session_id=COALESCE(NULLIF($1,''),stripe_session_id), stripe_customer_id=COALESCE(NULLIF($2,''),stripe_customer_id), local_payment_status=$3, updated_at=now() WHERE journey_id=$4 RETURNING *",
    [clean(stripeSessionId), clean(stripeCustomerId), clean(paymentStatus), journeyInternalId]
  );
  return updated.rows[0] || null;
}