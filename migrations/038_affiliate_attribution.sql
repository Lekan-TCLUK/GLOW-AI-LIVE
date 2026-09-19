CREATE TABLE IF NOT EXISTS glow_affiliate_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL,
  rewardful_referral_id text NOT NULL,
  rewardful_affiliate_id text,
  affiliate_first_name text,
  affiliate_last_name text,
  affiliate_email text,
  affiliate_state text,
  rewardful_campaign_id text,
  rewardful_campaign_name text,
  rewardful_link_id text,
  rewardful_link_token text,
  conversion_state text NOT NULL DEFAULT 'visitor',
  attribution_status text NOT NULL DEFAULT 'ATTRIBUTED',
  customer_email text,
  stripe_customer_id text,
  stripe_session_id text,
  stripe_account_id text,
  local_payment_status text,
  rewardful_sale_id text,
  rewardful_commission_id text,
  sale_amount_cents integer,
  sale_currency text,
  commission_amount_cents integer,
  commission_currency text,
  commission_state text,
  commission_due_at timestamptz,
  commission_paid_at timestamptz,
  commission_voided_at timestamptz,
  rewardful_referral_created_at timestamptz,
  rewardful_lead_at timestamptz,
  rewardful_conversion_at timestamptz,
  rewardful_updated_at timestamptz,
  last_rewardful_event_id text,
  last_rewardful_event_type text,
  raw_rewardful_referral jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_rewardful_affiliate jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_rewardful_sale jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_rewardful_commission jsonb NOT NULL DEFAULT '{}'::jsonb,
  attribution_source text NOT NULL DEFAULT 'rewardful',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT glow_affiliate_attributions_journey_key UNIQUE (journey_id),
  CONSTRAINT glow_affiliate_attributions_referral_key UNIQUE (rewardful_referral_id)
);

CREATE INDEX IF NOT EXISTS idx_glow_affiliate_attributions_affiliate
  ON glow_affiliate_attributions (rewardful_affiliate_id);

CREATE INDEX IF NOT EXISTS idx_glow_affiliate_attributions_status
  ON glow_affiliate_attributions (attribution_status, conversion_state);

INSERT INTO glow_affiliate_attributions (
  journey_id,
  rewardful_referral_id,
  customer_email,
  stripe_session_id,
  local_payment_status,
  attribution_status,
  attribution_source
)
SELECT
  j.id,
  j.rewardful_referral,
  j.email,
  j.stripe_session_id,
  j.payment_status,
  'ATTRIBUTED',
  'rewardful_legacy_backfill'
FROM glow_journeys j
WHERE NULLIF(TRIM(j.rewardful_referral), '') IS NOT NULL
ON CONFLICT DO NOTHING;